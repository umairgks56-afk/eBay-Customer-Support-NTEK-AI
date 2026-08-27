import express from "express";
import Groq from "groq-sdk";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);
const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

// Lightweight per-instance protection for a private tool. Vercel may run multiple
// instances, so this is intentionally a safety layer rather than a replacement for
// an external auth/rate-limit service.
const rateWindowMs = 10 * 60 * 1000;
const maxRequestsPerWindow = 20;
const requestLog = new Map();

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function rateLimit(req, res, next) {
  const now = Date.now();
  const ip = getClientIp(req);
  const recent = (requestLog.get(ip) || []).filter((time) => now - time < rateWindowMs);

  if (recent.length >= maxRequestsPerWindow) {
    const retryAfter = Math.max(1, Math.ceil((rateWindowMs - (now - recent[0])) / 1000));
    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({ error: "Too many requests. Please try again shortly." });
  }

  recent.push(now);
  requestLog.set(ip, recent);
  return next();
}

function cleanText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function getClient() {
  return process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
}

const systemPrompt = `You are NTEK eBay Customer Support AI for a UK eBay seller of household and everyday products. Write natural, polite, concise buyer-facing replies in UK English.
Rules:
- Never invent tracking, delivery dates, refunds, stock, guarantees or policies.
- Use only buyer/seller facts supplied in the request.
- If facts are missing, ask for confirmation or the necessary information.
- Never mention being an AI.
- De-escalate complaints and offer a practical next step when appropriate.
- Do not promise an outcome the seller has not confirmed.
- Return only the ready-to-send buyer reply.`;

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "NTEK Support AI", provider: "Groq", model });
});

app.post("/api/reply", rateLimit, async (req, res) => {
  try {
    const client = getClient();
    if (!client) {
      return res.status(503).json({ error: "Groq AI is not configured. Add GROQ_API_KEY in Vercel Environment Variables." });
    }

    const body = req.body || {};
    const buyerMessage = cleanText(body.buyerMessage, 6000);
    const context = cleanText(body.context, 5000);
    const tone = cleanText(body.tone, 120) || "friendly and professional";
    const length = cleanText(body.length, 40) || "normal";
    const productInfo = cleanText(body.productInfo, 4000);
    const settings = body.settings && typeof body.settings === "object" ? body.settings : {};
    const store = cleanText(settings.store, 120) || "NTEK";
    const signature = cleanText(settings.signature, 300);
    const instructions = cleanText(settings.instructions, 1500);

    if (!buyerMessage) {
      return res.status(400).json({ error: "Please provide a buyer message." });
    }

    const userPrompt = `Create an eBay buyer reply.
Tone: ${tone}
Length: ${length}
Store: ${store}
Default signature: ${signature || "None"}
Seller instructions: ${instructions || "None"}
Product information: ${productInfo || "None"}
Seller/order context: ${context || "No additional context."}

Buyer message:
${buyerMessage}`;

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.55,
      max_completion_tokens: 500
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return res.status(502).json({ error: "The AI returned an empty response." });
    }

    return res.json({ reply, model });
  } catch (error) {
    console.error("Groq request failed:", error);
    const status = Number(error?.status) || 500;
    const publicMessage = status === 429
      ? "Groq rate limit reached. Please wait a moment and try again."
      : status >= 500
        ? "The AI service is temporarily unavailable. Please try again shortly."
        : "The AI request could not be completed.";
    return res.status(status).json({ error: publicMessage });
  }
});

// Express 5 requires a named wildcard. This also catches the root route for the SPA.
app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Vercel uses the exported Express app. Local development still uses npm start.
export default app;

if (!process.env.VERCEL) {
  app.listen(port, () => console.log(`NTEK Support AI running on port ${port}`));
}
