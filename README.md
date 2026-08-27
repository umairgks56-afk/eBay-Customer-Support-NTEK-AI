# NTEK eBay Customer Support AI

NTEK's eBay buyer-reply generator powered by the Groq API.

## Groq setup

Create an API key in the Groq Console and add these environment variables to your host:

- `GROQ_API_KEY` — secret Groq API key. Never commit it.
- `GROQ_MODEL` — optional; defaults to `openai/gpt-oss-120b`.

## Vercel deployment

Import this GitHub repository into Vercel. Use the repository root as the Root Directory. No build command or output directory is required. Add the environment variables above for Production and Preview, then deploy.

## Local development

```bash
npm install
GROQ_API_KEY=gsk_your_key npm start
```

On Windows PowerShell:

```powershell
$env:GROQ_API_KEY="gsk_your_key"
npm start
```

The Express app serves the UI and `/api/reply`. The server has request-size validation, basic per-IP rate limiting, safe public error messages, and keeps the Groq key server-side.
