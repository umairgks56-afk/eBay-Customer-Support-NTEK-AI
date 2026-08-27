import express from "express";
import Groq from "groq-sdk";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3000;
const model = process.env.GROQ_MODEL || "qwen/qwen3-32b";

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function getClient() {
  if (!process.env.GROQ_API_KEY) return null;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

const systemPrompt = `You are NTEK eBay Customer Support AI. NTEK is a UK eBay seller of household and everyday products.
Your job is to write helpful, polite, concise buyer replies that are suitable to send on eBay.
Rules:
- Be professional, friendly and natural. Never sound robotic.
- Answer only from information supplied by the seller or buyer. Never invent delivery dates, refunds, tracking numbers, stock, guarantees or policies.
- If information is missing, say what needs to be confirmed instead of guessing.
- Keep normal replies short: usually 2-5 sentences.
- Use UK English.
- Do not mention that you are an AI.
- Do not promise something the seller has not confirmed.
- When the buyer is unhappy, acknowledge the concern and offer a practical next step.
- Return only the customer-facing reply unless the user explicitly asks for analysis.`;

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, provider: "Groq", model, configured: Boolean(process.env.GROQ_API_KEY) });
});

app.post("/api/reply", async (req, res) => {
  try {
    const client = getClient();
    if (!client) {
      return res.status(500).json({ error: "GROQ_API_KEY is not configured on the server." });
    }

    const { buyerMessage, context = "", tone = "friendly and professional" } = req.body || {};
    if (!buyerMessage || typeof buyerMessage !== "string") {
      return res.status(400).json({ error: "Please provide a buyer message." });
    }

    const userPrompt = `Write an eBay buyer reply in a ${tone} tone.\n\nBuyer message:\n${buyerMessage.trim()}\n\nSeller context (use only if provided):\n${String(context).trim() || "No additional seller context was provided."}`;

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.6,
      max_completion_tokens: 500
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();
    if (!reply) return res.status(502).json({ error: "The AI returned an empty response." });
    res.json({ reply, model });
  } catch (error) {
    console.error(error);
    const status = error?.status || 500;
    res.status(status).json({ error: error?.error?.error?.message || error?.message || "AI request failed." });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => console.log(`NTEK eBay Support AI running on port ${port}`));
