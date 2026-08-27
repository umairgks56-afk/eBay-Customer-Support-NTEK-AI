# NTEK eBay Customer Support AI

A lightweight eBay buyer-reply generator powered by the Groq API.

## Current Groq model

The app currently defaults to:

`openai/gpt-oss-120b`

Groq currently lists GPT-OSS 120B as a production model. Groq also provides a free tier with model-specific rate limits; exact limits can change, so check your Groq Console before production use.

## Required environment variables

Set these on Vercel under **Project Settings → Environment Variables**:

- `GROQ_API_KEY` — your private Groq API key
- `GROQ_MODEL` — optional; defaults to `openai/gpt-oss-120b`

**Never put the real API key in GitHub, frontend JavaScript, or `.env.example`.**

## Local setup

```bash
npm install
```

Create `.env` locally:

```env
GROQ_API_KEY=your_real_groq_key
GROQ_MODEL=openai/gpt-oss-120b
```

Then run:

```bash
npm start
```

The app is served by Express and exposes `/api/reply` and `/api/health`.

## Vercel deployment

1. Import this GitHub repository into Vercel.
2. Use the default Node/Express detection.
3. Add `GROQ_API_KEY` in Vercel Environment Variables for the Production environment (and Preview if needed).
4. Optionally add `GROQ_MODEL=openai/gpt-oss-120b`.
5. Deploy.
6. Open `/api/health` on the deployed domain to verify the app is running.

The Express app is exported for Vercel and only calls `app.listen()` during local development.

## Security protections

- Groq API key stays server-side.
- Express 5 wildcard routing is compatible with the current Express syntax.
- JSON request body is limited to 256 KB.
- Buyer/context/settings fields have explicit length limits.
- `/api/reply` has a lightweight per-IP rate limit.
- Detailed upstream Groq errors are not exposed to public clients.
- `.env`, `.env.local`, and `.vercel` are ignored by Git.
