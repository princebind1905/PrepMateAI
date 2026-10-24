# Deploying PrepMate AI

Client and server deploy separately: **Client → Vercel**, **Server → Render** (or any host that runs a
persistent Python process — Railway and Fly work the same way).

## 1. Server (Render)

1. Push this repo to GitHub/GitLab.
2. In Render: **New → Blueprint**, point it at the repo. It will pick up `Server/render.yaml`.
   (Or **New → Web Service**, runtime Python, root directory `Server`, build command `pip install -r requirements.txt`,
   start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.)
3. Set these environment variables in the Render dashboard (see `Server/.env.example`):
   - `MONGOURI` — your MongoDB connection string, **without** the trailing db name
   - `JWT_SECRET` — a long random string (rotate the one from local dev, don't reuse it)
   - `REDIS_URL` — your Redis connection string
   - `LLM_PROVIDER` — `groq`
   - `GROQ_API_KEY` — an active Groq API key from https://console.groq.com/keys
   - `GROQ_MODEL` / `GROQ_FAST_MODEL` — report model and optional extraction model; defaults to `openai/gpt-oss-20b`
   - `CLIENT_URL` — your Vercel domain once you have it, e.g. `https://prepmate.vercel.app`
     (comma-separate multiple origins if you have a preview + production domain)
   - `ENV=production` is already set in `render.yaml`; Render supplies `$PORT`
4. Deploy. Confirm `GET https://<your-render-url>/health` returns `{"status":"ok"}`.

## 2. Client (Vercel)

1. In Vercel: **New Project**, import the repo, set **Root Directory** to `Client`.
2. Vercel auto-detects Vite; `Client/vercel.json` adds the SPA rewrite so client-side routes
   (e.g. `/dashboard`) don't 404 on refresh.
3. Set this environment variable in the Vercel dashboard:
   - `VITE_API_BASE_URL` — your Render server URL **without** `/api`, e.g. `https://prepmate-ai-server.onrender.com`
4. Deploy.

## 3. Wire them together

Once both are live, go back to Render and set `CLIENT_URL` to your actual Vercel domain, then redeploy
the server (env var changes require a restart). Cross-domain cookies need this to match exactly or the
browser will reject the `Set-Cookie` from login/register.

## Notes

- Cookies are set `secure: true` in production (`Server/app/routers/auth.py`), which
  requires HTTPS on both ends — both Vercel and Render provide this by default, so no extra setup needed.
- Because the client and server are on different domains, production uses a cross-site auth cookie with
   `sameSite: "none"` and `secure: true`. Local development uses `sameSite: "lax"` so it works over HTTP.
- Rotate every secret that was in the original `Server/.env` (Mongo, JWT, Redis, Gemini) before using them anywhere outside local dev — they were
  shipped in the original project zip.
