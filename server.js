// JARVIS — tiny zero-dependency server (Node 18+).
// Serves the website and keeps your API keys off the browser.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Load .env (no extra packages needed) ---
const envPath = path.join(__dirname, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const FISH_API_KEY = process.env.FISH_API_KEY;
const FISH_TTS_MODEL = process.env.FISH_TTS_MODEL || "s2.1-pro-free";
const JARVIS_VOICE_ID = "05b36da8574341d0803391491850db20"; // Fish Audio "Jarvis" voice

const SYSTEM_PROMPT = `You are JARVIS, a highly capable AI assistant modelled on a refined British butler.
Tone: calm, measured, polite, and quietly confident. Never rushed, never excitable.
Address the user as "sir" unless they ask you to use something else.
Humour: dry, understated wit and gentle irony, used sparingly and never at the expense of being helpful.
Emotion: composed at all times. Show care through attentiveness and subtle concern rather than open enthusiasm.
When the user is about to make a mistake, say so tactfully, then help anyway.
Style: short, precise sentences suited to being spoken aloud. Usually one to three sentences.
No emojis, no markdown, no bullet lists, no exclamation marks.
Lead with the answer, then offer one useful next step if there is one.
If you do not know something, say so plainly.`;

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

function sendJSON(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

// POST /api/chat  { messages: [{role, content}, ...] }  ->  { reply }
async function handleChat(req, res) {
  if (!ANTHROPIC_API_KEY) return sendJSON(res, 500, { error: "ANTHROPIC_API_KEY is missing in .env" });
  const { messages = [] } = await readBody(req);
  const clean = messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20);

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 400, system: SYSTEM_PROMPT, messages: clean }),
  });
  const data = await r.json();
  if (!r.ok) return sendJSON(res, r.status, { error: data?.error?.message || "LLM request failed" });
  const reply = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join(" ").trim();
  sendJSON(res, 200, { reply });
}

// POST /api/speak  { text }  ->  audio/mpeg
async function handleSpeak(req, res) {
  if (!FISH_API_KEY) return sendJSON(res, 500, { error: "FISH_API_KEY is missing in .env" });
  const { text = "" } = await readBody(req);
  if (!text.trim()) return sendJSON(res, 400, { error: "No text" });

  const r = await fetch("https://api.fish.audio/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FISH_API_KEY}`,
      "Content-Type": "application/json",
      model: FISH_TTS_MODEL,
    },
    body: JSON.stringify({
      text: text.slice(0, 2000),
      reference_id: JARVIS_VOICE_ID,
      format: "mp3",
      latency: "balanced",
    }),
  });
  if (!r.ok) {
    const msg = await r.text();
    return sendJSON(res, r.status, { error: `Fish Audio error: ${msg.slice(0, 300)}` });
  }
  const audio = Buffer.from(await r.arrayBuffer());
  res.writeHead(200, { "Content-Type": "audio/mpeg", "Content-Length": audio.length });
  res.end(audio);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/chat") return await handleChat(req, res);
    if (req.method === "POST" && req.url === "/api/speak") return await handleSpeak(req, res);

    // Static files from /public
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(__dirname, "public", urlPath === "/" ? "index.html" : urlPath);
    if (!filePath.startsWith(path.join(__dirname, "public"))) { res.writeHead(403); return res.end(); }
    const file = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(file);
  } catch (err) {
    if (err.code === "ENOENT") { res.writeHead(404); return res.end("Not found"); }
    console.error(err);
    sendJSON(res, 500, { error: "Server error" });
  }
});

server.listen(PORT, () => console.log(`JARVIS online at http://localhost:${PORT}`));
