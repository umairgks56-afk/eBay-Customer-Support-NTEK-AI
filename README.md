# NTEK eBay Customer Support AI

A simple eBay buyer-reply generator powered by Groq and Qwen 3 32B.

## Environment variables

Set these on your hosting platform:

- `GROQ_API_KEY` — your Groq Console API key
- `GROQ_MODEL` — `qwen/qwen3-32b` (optional; this is the default)

Never commit the API key to GitHub.

## Run locally

```bash
npm install
GROQ_API_KEY=your_key npm start
```

The app serves the UI and `/api/reply` from the same Express server.

Groq's API uses the chat-completions interface and the Qwen 3 32B model is available through Groq. See the official Groq documentation for current model availability and limits.
