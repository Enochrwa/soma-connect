import { env } from "../config/env.js";

const HF_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

export async function somaAiReply(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
) {
  if (!env.HF_API_TOKEN) {
    return "SOMA AI isn't connected yet — add HF_API_TOKEN to your .env to enable chat.";
  }
  const prompt = messages
    .map((m) => (m.role === "user" ? `[INST] ${m.content} [/INST]` : m.content))
    .join("\n");
  try {
    const res = await fetch(HF_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.HF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 256, temperature: 0.6 },
      }),
    });
    if (res.status === 429 || res.status === 503) {
      return "SOMA AI is busy right now — try again in a moment.";
    }
    const data = (await res.json()) as Array<{ generated_text?: string }>;
    return data?.[0]?.generated_text?.trim() ?? "Sorry — I couldn't think of anything just now.";
  } catch (err) {
    console.error("[ai] hf error", err);
    return "SOMA AI is taking a break — please try again soon.";
  }
}

export async function summarizeReviews(text: string) {
  if (!env.HF_API_TOKEN || !text) return "";
  try {
    const res = await fetch("https://api-inference.huggingface.co/models/facebook/bart-large-cnn", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.HF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text.slice(0, 4000) }),
    });
    const data = (await res.json()) as Array<{ summary_text?: string }>;
    return data?.[0]?.summary_text ?? "";
  } catch {
    return "";
  }
}
