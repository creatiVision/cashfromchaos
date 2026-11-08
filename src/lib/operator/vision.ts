// ============================================================================
// Hermes Vision Bridge — Multimodal Visual Item Analysis
// ----------------------------------------------------------------------------
// Analyzes images of physical items for Hermes operator:
// 1. Local vision models (Ollama endpoint: e.g. qwen3.8:latest, qwen2-vl, or Hermes Vision)
// 2. OpenRouter / Nous / OpenAI-compatible multimodal endpoint
// 3. Fallback gracefully to archetype classification
// ============================================================================

import type { ItemCondition, Confidence, CriticalQuestion } from "@/lib/types";

export interface VisionAnalysisResult {
  title: string;
  category: string;
  detectedAttributes: Record<string, string>;
  condition: ItemCondition;
  confidence: Confidence;
  estimatedMarketLow: number;
  estimatedMarketHigh: number;
  rationale: string[];
  missingInfo: CriticalQuestion[];
  flags: string[];
  description?: string;
  sellingPoints?: string[];
}

export async function analyzeItemVision(
  photos: string[],
  clue?: string,
  notes?: string
): Promise<VisionAnalysisResult | null> {
  if (!photos || photos.length === 0) return null;

  const primaryPhoto = photos[0];
  if (!primaryPhoto) return null;

  // Check if Ollama or Vision endpoint is configured
  const visionUrl = process.env.VISION_API_URL || "http://127.0.0.1:11434/api/generate";
  const visionModel = process.env.VISION_MODEL || "qwen3.8:latest";

  try {
    // If it's a data URL or base64
    let base64Image = "";
    if (primaryPhoto.startsWith("data:")) {
      base64Image = primaryPhoto.split(",")[1] || "";
    } else if (primaryPhoto.startsWith("/img/")) {
      // In local demo fixtures, try to load file or use sample description
      return null; // let archetype handle static sample assets
    }

    if (!base64Image) return null;

    const prompt = `You are the Hermes Vision engine for CashFromChaos, an autonomous recommerce operator.
Analyze this item photo. Seller clue: "${clue || ""}". Extra notes: "${notes || ""}".
Respond ONLY with a JSON object in this exact schema:
{
  "title": "short descriptive marketplace title (under 60 chars)",
  "category": "one of: electronics, musical-instruments, collectibles, furniture, baby-kids, general",
  "condition": "one of: new, like-new, good, fair, for-parts, unknown",
  "confidence": "one of: high, medium-high, medium, low",
  "estimatedMarketLow": number in EUR,
  "estimatedMarketHigh": number in EUR,
  "detectedAttributes": { "brand": "string", "model": "string", "color": "string" },
  "rationale": ["bullet reason 1", "bullet reason 2"],
  "missingInfo": [
    {
      "id": "question_id",
      "question": "question for seller",
      "reason": "why this is critical",
      "options": ["option 1", "option 2"]
    }
  ],
  "flags": ["fragile", "authentic-check-needed"],
  "description": "2-3 sentences buyer-facing marketplace description",
  "sellingPoints": ["key point 1", "key point 2"]
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(visionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: visionModel,
        prompt,
        images: [base64Image],
        stream: false,
        format: "json",
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const parsed = JSON.parse(data.response || "{}");

    if (!parsed.title || !parsed.category || typeof parsed.estimatedMarketLow !== "number") {
      return null;
    }

    return {
      title: String(parsed.title).slice(0, 70),
      category: String(parsed.category),
      condition: parsed.condition || "good",
      confidence: parsed.confidence || "medium",
      estimatedMarketLow: Number(parsed.estimatedMarketLow) || 10,
      estimatedMarketHigh: Number(parsed.estimatedMarketHigh) || 20,
      detectedAttributes: parsed.detectedAttributes || {},
      rationale: Array.isArray(parsed.rationale) ? parsed.rationale : ["Visual identification by Hermes Vision"],
      missingInfo: Array.isArray(parsed.missingInfo) ? parsed.missingInfo : [],
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      description: parsed.description,
      sellingPoints: parsed.sellingPoints,
    };
  } catch (err) {
    // Fail-open: return null so operator seamlessly falls back to archetype
    return null;
  }
}
