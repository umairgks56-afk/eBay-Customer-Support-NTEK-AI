const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 20);
const buckets = new Map();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));

function rateLimit(req, res, next) {
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  let bucket = buckets.get(ip);
  if (!bucket || now - bucket.start >= RATE_LIMIT_WINDOW_MS) {
    bucket = { start: now, count: 0 };
    buckets.set(ip, bucket);
  }
  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - bucket.start)) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  next();
}

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, provider: 'groq', model: GROQ_MODEL });
});

app.post('/api/reply', rateLimit, async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'AI service is not configured.' });

    const buyerMessage = clean(req.body?.buyerMessage, 5000);
    const context = clean(req.body?.context, 5000);
    const settings = clean(req.body?.settings, 3000);
    if (!buyerMessage) return res.status(400).json({ error: 'Buyer message is required.' });

    const system = `You are NTEK eBay customer support. Write a concise, polite, professional UK-English buyer reply. Never invent order facts, tracking details, refunds, policies, or promises. If information is missing, say so clearly. Return only the message ready to send.`;
    const user = `Buyer message:\n${buyerMessage}\n\nOrder/context:\n${context || 'None provided'}\n\nReply preferences:\n${settings || 'Professional, friendly, concise'}`;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: GROQ_MODEL, temperature: 0.4, max_tokens: 500, messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ] })
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Groq API error:', response.status, detail.slice(0, 1000));
      return res.status(502).json({ error: 'The AI provider is temporarily unavailable.' });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) return res.status(502).json({ error: 'The AI returned an empty response.' });
    res.json({ reply });
  } catch (error) {
    console.error('Reply endpoint error:', error);
    res.status(500).json({ error: 'Unable to generate a reply right now.' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('/{*splat}', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

if (!process.env.VERCEL) app.listen(PORT, () => console.log(`NTEK AI running on port ${PORT}`));

module.exports = app;
