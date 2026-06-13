import { env } from "../config/env.js";

const HF_BASE = "https://api-inference.huggingface.co/models";

// ── Generic HF inference helper ───────────────────────────────────────────────
async function hfPost<T>(model: string, body: unknown): Promise<T | null> {
  if (!env.HF_API_TOKEN) return null;
  try {
    const res = await fetch(`${HF_BASE}/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.HF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ── 1. Upgraded Chat (Zephyr-7B-beta — returns only assistant turn) ──────────
export async function somaAiReply(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
): Promise<string> {
  if (!env.HF_API_TOKEN) {
    return "SOMA AI isn't connected yet — add HF_API_TOKEN to your .env to enable chat.";
  }

  // Build OpenAI-compatible messages for Zephyr
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role !== "system");

  // Format as <|system|>...<|user|>...<|assistant|>
  const parts: string[] = [];
  if (systemMsg) parts.push(`<|system|>\n${systemMsg.content}</s>`);
  for (const m of chatMessages) {
    if (m.role === "user") parts.push(`<|user|>\n${m.content}</s>`);
    else parts.push(`<|assistant|>\n${m.content}</s>`);
  }
  parts.push("<|assistant|>");
  const prompt = parts.join("\n");

  try {
    const res = await fetch(`${HF_BASE}/HuggingFaceH4/zephyr-7b-beta`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.HF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 300, temperature: 0.6, return_full_text: false },
      }),
    });

    if (res.status === 429 || res.status === 503) {
      return "SOMA AI is busy right now — try again in a moment.";
    }
    const data = (await res.json()) as Array<{ generated_text?: string }>;
    const text = data?.[0]?.generated_text?.trim() ?? "";
    // Strip any trailing role tokens
    return (
      text.replace(/<\|.*?\|>.*$/s, "").trim() || "Sorry — I couldn't think of anything just now."
    );
  } catch (err) {
    console.error("[ai] hf error", err);
    return "SOMA AI is taking a break — please try again soon.";
  }
}

// ── 2. Auto-generate product description ──────────────────────────────────────
export async function generateProductDescription(title: string, category: string): Promise<string> {
  const prompt = `<|user|>\nWrite a 3-sentence product description for a listing called "${title}" in the "${category}" category on a Rwandan marketplace. Be concise and persuasive.\n</s>\n<|assistant|>`;
  const data = await hfPost<Array<{ generated_text?: string }>>("HuggingFaceH4/zephyr-7b-beta", {
    inputs: prompt,
    parameters: { max_new_tokens: 150, temperature: 0.7, return_full_text: false },
  });
  const raw = data?.[0]?.generated_text?.trim() ?? "";
  return raw.replace(/<\|.*?\|>.*$/s, "").trim();
}

// ── 3. Auto-generate product tags ─────────────────────────────────────────────
export async function generateProductTags(
  description: string,
  category: string,
): Promise<string[]> {
  const candidates = [
    category.toLowerCase(),
    "new",
    "quality",
    "rwanda",
    "kigali",
    "best price",
    "delivery",
    "authentic",
    "popular",
    "local",
    "imported",
    "original",
    "discount",
    "sale",
    "limited",
  ];

  const data = await hfPost<Array<{ labels: string[]; scores: number[] }>>(
    "facebook/bart-large-mnli",
    {
      inputs: description.slice(0, 500),
      parameters: { candidate_labels: candidates, multi_label: true },
    },
  );

  if (!data?.[0]?.labels) return [category.toLowerCase()];
  return data[0].labels.filter((_, i) => (data[0].scores?.[i] ?? 0) > 0.3).slice(0, 8);
}

// ── 4. Review sentiment + toxicity analysis ───────────────────────────────────
export interface SentimentResult {
  sentiment: "positive" | "neutral" | "negative";
  score: number; // 0–1, confidence of that label
  needsModeration: boolean;
}

export async function analyzeReviewSentiment(text: string): Promise<SentimentResult> {
  const data = await hfPost<Array<Array<{ label: string; score: number }>>>(
    "cardiffnlp/twitter-roberta-base-sentiment-latest",
    { inputs: text.slice(0, 512) },
  );

  const results = data?.[0];
  if (!results) return { sentiment: "neutral", score: 0.5, needsModeration: false };

  const sorted = [...results].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const labelMap: Record<string, "positive" | "neutral" | "negative"> = {
    positive: "positive",
    neutral: "neutral",
    negative: "negative",
    LABEL_0: "negative",
    LABEL_1: "neutral",
    LABEL_2: "positive",
  };

  const sentiment = labelMap[top.label] ?? "neutral";
  const needsModeration = sentiment === "negative" && top.score > 0.8;

  return { sentiment, score: top.score, needsModeration };
}

// ── 5. Upgraded review summarisation (Zephyr instead of BART-CNN) ─────────────
export async function summarizeReviews(reviewTexts: string): Promise<string> {
  if (!env.HF_API_TOKEN || !reviewTexts) return "";
  const prompt = `<|user|>\nSummarise these customer reviews in 2 sentences focusing on key pros and cons:\n\n${reviewTexts.slice(0, 2000)}\n</s>\n<|assistant|>`;
  const data = await hfPost<Array<{ generated_text?: string }>>("HuggingFaceH4/zephyr-7b-beta", {
    inputs: prompt,
    parameters: { max_new_tokens: 120, temperature: 0.4, return_full_text: false },
  });
  const raw = data?.[0]?.generated_text?.trim() ?? "";
  return raw.replace(/<\|.*?\|>.*$/s, "").trim();
}

// ── 6. Smart seller reply drafts ──────────────────────────────────────────────
export async function draftSellerReply(reviewText: string): Promise<string> {
  const prompt = `<|system|>\nYou are a professional e-commerce seller on a Rwandan marketplace. Write polite, friendly, and brief replies.\n</s>\n<|user|>\nWrite a polite 2-sentence reply to this customer review: "${reviewText.slice(0, 400)}"\n</s>\n<|assistant|>`;
  const data = await hfPost<Array<{ generated_text?: string }>>("HuggingFaceH4/zephyr-7b-beta", {
    inputs: prompt,
    parameters: { max_new_tokens: 100, temperature: 0.5, return_full_text: false },
  });
  const raw = data?.[0]?.generated_text?.trim() ?? "";
  return (
    raw.replace(/<\|.*?\|>.*$/s, "").trim() ||
    "Thank you for your review! We appreciate your feedback and will use it to improve our service."
  );
}

// ── 7. Semantic product search embeddings ─────────────────────────────────────
export async function getEmbedding(text: string): Promise<number[] | null> {
  const data = await hfPost<number[][]>("sentence-transformers/all-MiniLM-L6-v2", {
    inputs: text.slice(0, 512),
  });
  return data?.[0] ?? null;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

// ── 8. Dispute auto-classification ───────────────────────────────────────────
export interface DisputeClassification {
  reason: "wrong_item" | "damaged" | "not_delivered" | "quality_issue" | "other";
  severity: "high" | "medium" | "low";
}

export async function classifyDispute(description: string): Promise<DisputeClassification> {
  const reasonLabels = [
    "wrong item received",
    "item is damaged",
    "item not delivered",
    "quality issue with product",
    "other problem",
  ];
  const reasonKeys: DisputeClassification["reason"][] = [
    "wrong_item",
    "damaged",
    "not_delivered",
    "quality_issue",
    "other",
  ];

  const severityLabels = [
    "urgent high severity complaint",
    "medium severity issue",
    "low severity minor complaint",
  ];

  const [reasonData, severityData] = await Promise.all([
    hfPost<Array<{ labels: string[]; scores: number[] }>>("facebook/bart-large-mnli", {
      inputs: description.slice(0, 500),
      parameters: { candidate_labels: reasonLabels },
    }),
    hfPost<Array<{ labels: string[]; scores: number[] }>>("facebook/bart-large-mnli", {
      inputs: description.slice(0, 500),
      parameters: { candidate_labels: severityLabels },
    }),
  ]);

  const reasonIdx = reasonData?.[0]?.labels?.length
    ? reasonLabels.indexOf(reasonData[0].labels[0])
    : 4;
  const reason = reasonKeys[reasonIdx >= 0 ? reasonIdx : 4];

  const severityLabel = severityData?.[0]?.labels?.[0] ?? "medium severity issue";
  let severity: "high" | "medium" | "low" = "medium";
  if (severityLabel.includes("urgent") || severityLabel.includes("high")) severity = "high";
  else if (severityLabel.includes("low") || severityLabel.includes("minor")) severity = "low";

  return { reason, severity };
}
