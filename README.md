# J.A.R.V.I.S.

A JARVIS-style AI assistant website. Claude provides the thinking, and the Fish Audio
"Jarvis" voice (model `05b36da8574341d0803391491850db20`) speaks every reply.

## What you need
- Node.js 18 or newer
- A Claude API key: https://console.anthropic.com
- A Fish Audio API key: https://fish.audio

## Run it
1. Copy `.env.example` to `.env` and paste in both keys.
2. In this folder, run:
   ```
   npm start
   ```
3. Open http://localhost:3000 in Chrome or Edge.

No `npm install` is needed. The server has zero dependencies.

## Put it online (Render, free)
1. Sign in at https://render.com with your GitHub account.
2. Click **New → Blueprint** and pick this repository. Render reads `render.yaml`.
3. When asked, paste your `ANTHROPIC_API_KEY` and `FISH_API_KEY`, then click **Apply**.
4. After a minute or two you get a public link like `https://jarvis-xxxx.onrender.com`.

Never upload your `.env` file to GitHub. Keys belong only in Render's settings.
On the free plan the site sleeps after 15 minutes of no use, so the first visit
after that takes about a minute to wake up.

## Using it
- Type a message and press Enter, or click the mic and speak (Chrome or Edge).
- The ring pulses with JARVIS's voice while he talks.
- **VOICE: ON/OFF** in the top right mutes speech and shows text only.

## Changing things
- **Personality:** edit `SYSTEM_PROMPT` in `server.js`.
- **Voice model tier:** set `FISH_TTS_MODEL` in `.env` (`s2.1-pro-free` for the free developer tier).
- **Brain model:** set `ANTHROPIC_MODEL` in `.env`.

## Files
- `server.js` — serves the page and calls Claude and Fish Audio, keeping your keys private.
- `public/index.html` — the whole interface (HTML, CSS and JavaScript in one file).
