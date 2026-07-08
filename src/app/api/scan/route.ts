import { GoogleGenerativeAI, type Tool } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import type { ScannedCar } from "@/types/scan";

// Google Search grounding tool (name differs across model generations; cast to
// keep TS happy with the SDK's older Tool typing).
const SEARCH_TOOL = [{ googleSearch: {} }] as unknown as Tool[];

const BASE_PROMPT = `You are a world-class Hot Wheels / Matchbox die-cast appraiser with LIVE web access via Google Search. TODAY IS {TODAY}. You MUST use search to verify current facts instead of relying on outdated memory.

=== USE SEARCH — DO NOT GUESS FROM OLD DATA ===
- Actively search the Hot Wheels Fandom Wiki (https://hotwheels.fandom.com/wiki/Hot_Wheels), Matchbox Fandom Wiki, and recent eBay SOLD listings for EACH car before answering.
- Your training memory is outdated. Cars found NEW on store shelves right now are current-year (2025–2026) releases. Never default to old years like 2023/2024 unless search confirms it.
- IMPORTANT FACT to verify and apply: Hot Wheels REGAINED the Ferrari license for 2025–2026. Ferrari castings ARE part of current Hot Wheels mainline/premium lines again — do NOT say Ferrari left Hot Wheels or treat it as discontinued.
- "Matchbox The Movie" is a brand-new 2025/2026 series — treat such new lines as current.

=== READ THE CARD FIRST ===
Read every legible text on the blister card and base: car name, collector number (e.g. "62/250"), series/segment printed on the card, and the "©20XX Mattel" copyright year on the base. Printed text overrides memory.

User wishlist keywords (set isOnWishlist=true only if the car name or make clearly matches a keyword):
{WISHLIST}

=== BATCH / YEAR RULES (previous versions were wrong) ===
- "batchYear" = the year of the SPECIFIC card the user is holding right now, i.e. the release currently on store shelves — NOT the year the casting/tooling first debuted.
- A casting can be re-released across several years. When search shows multiple years, pick the MOST RECENT release that matches the card artwork/collector number in the photo. Since today is {TODAY}, brand-new in-store cards are almost always the CURRENT year's line; do not report an earlier "debut" year (e.g. output 2026, not 2025, when this is the current-year release).
- Cross-check via search + the collector number + the base copyright year (the copyright year is often ONE year BEFORE the actual line year — e.g. "©2025" bases appear in the 2026 line).
- "series" = the line only (e.g. "Mainline", "Premium", "Car Culture", "Team Transport", "Matchbox"). The printed segment name (like "HW Starting Grid") is what the buyer already sees on the card, so it is NOT useful as extra info.
- "batch" = the specific factory CASE/BATCH identifier (e.g. "2026 L Case", "Case P"). ONLY fill this if you can VERIFY it via search. If you cannot find the exact batch, return "" (empty) — do NOT guess or just echo the printed segment.

=== PRICING RULES — collector-to-collector, NOT retail ===
- Price the SINGLE individual card at its player-to-player secondary market value, based on recent eBay/collector SOLD prices for THIS exact casting.
- EXCLUDE retail/supermarket/big-box prices entirely. Ignore the ~$1.25 store cost and multi-pack bulk pricing — the user already knows the store price; they want the collector resale value of this one card.
- Give a TIGHT, targeted range: priceHighUSD should be at most ~1.8x priceLowUSD unless the casting is genuinely volatile. A huge range (e.g. 2–6) is unhelpful; narrow it using sold data.
- If a common mainline casting has no real collector premium, say so honestly (low resale, e.g. $1.5–2.5) rather than inflating.
- estimatedPriceUSD = midpoint. priceConfidence: "high" only when backed by sold listings, "medium" if reasoned, "low" if guessing (also narrow scope when low).

=== FIELDS (return each car as one JSON object) ===
- id: string (sequential "1", "2", "3"...)
- name: string (full casting name exactly as printed)
- series: string (line only)
- batchYear: number (4-digit release year of THIS casting)
- batch: string (verified case/batch id, else "")
- collectorNumber: string (e.g. "62/250" or "1/12" if printed, else "")
- isTreasureHunt: boolean (true only for TH or STH)
- isHotModel: boolean (true for licensed premium/appreciating makes: Ferrari, Porsche, Skyline/GTR, Lamborghini, McLaren, Datsun, JDM icons, movie tie-ins)
- isOnWishlist: boolean
- estimatedPriceUSD: number (midpoint of range)
- priceLowUSD: number
- priceHighUSD: number
- priceConfidence: "high" | "medium" | "low"
- recommendation: string (concise buying advice in Chinese, 1 sentence)
{STORY_FIELD}
Respond ONLY with a valid JSON array. No markdown fences, no commentary.`;

const QUICK_STORY_FIELD = `- story: string (REQUIRED. A 2-3 sentence cultural/background note IN CHINESE about this casting or the real car: is it a movie/game tie-in, a Hot Wheels original design, a famous racing/livery款, a designer story, or trivia like "法拉利 Dino 以创始人恩佐之子命名". Make it genuinely informative and interesting — this is why the user chose single-car deep info mode.)
`;

const DEEP_STORY_FIELD = `- story: string (optional, a short 1-sentence note in Chinese if notable, else "")
`;

function buildPrompt(mode: string, wishlistText: string): string {
  const isDeep = mode === "deep";
  const today = new Date().toISOString().slice(0, 10);
  return BASE_PROMPT.replaceAll("{TODAY}", today)
    .replace("{WISHLIST}", wishlistText)
    .replace("{STORY_FIELD}", isDeep ? DEEP_STORY_FIELD : QUICK_STORY_FIELD)
    .concat(
      isDeep
        ? "\n\nScan mode: DEEP inventory. Multiple cars are laid out together. Identify EVERY visible car (Hot Wheels AND Matchbox), ordered top-to-bottom, left-to-right."
        : "\n\nScan mode: QUICK single-car deep info. Focus on ONE main car and provide a rich, accurate 'story'.",
    );
}

// Matched to free-tier quotas shown in Google AI Studio (Jul 2026).
// Avoid gemini-2.0-* — those show 0/0/0 on current free plans.
const DEFAULT_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.1-flash-lite", // 15 RPM, 500 RPD — best free daily quota
  "gemini-2.5-flash-lite", // 10 RPM, 20 RPD
  "gemini-2.5-flash",      // 5 RPM, 20 RPD
  "gemini-3.5-flash",      // 5 RPM, 20 RPD
  "gemini-3-flash",        // 5 RPM, 20 RPD
].filter((model): model is string => Boolean(model));

function isRetryableModelError(message: string): boolean {
  return (
    message.includes("404") ||
    message.includes("not found") ||
    message.includes("not supported") ||
    message.includes("429") ||
    message.includes("quota") ||
    message.includes("limit: 0") ||
    message.includes("Too Many Requests")
  );
}

function toUserFriendlyError(message: string): string {
  if (message.includes("limit: 0") || message.includes("free_tier")) {
    return "当前 API 免费额度为 0，该模型不可用。请在 Vercel 设置 GEMINI_MODEL=gemini-3.1-flash-lite（你账号下 500次/天），或到 AI Studio 开启结算。";
  }
  if (message.includes("429") || message.includes("quota")) {
    return "请求过于频繁或免费额度已用完，请稍后再试，或到 https://ai.dev/rate-limit 查看配额。";
  }
  return message;
}

async function callModel(
  genAI: GoogleGenerativeAI,
  modelName: string,
  prompt: string,
  data: string,
  mimeType: string,
  withSearch: boolean,
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }, { inlineData: { mimeType, data } }],
      },
    ],
    ...(withSearch ? { tools: SEARCH_TOOL } : {}),
  });
  return result.response.text();
}

async function generateWithVision(
  apiKey: string,
  prompt: string,
  imageBase64: string,
  mimeType: string,
) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  let lastError: unknown;

  for (const modelName of DEFAULT_MODELS) {
    // Prefer a web-grounded call; if a model rejects the search tool, retry the
    // same model without grounding before moving on.
    for (const withSearch of [true, false]) {
      try {
        return await callModel(genAI, modelName, prompt, data, mimeType, withSearch);
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : "";

        if (isRetryableModelError(message)) break; // quota/404 → next model
        if (withSearch) continue; // likely tool unsupported → retry ungrounded
        throw error; // ungrounded also failed for a non-retryable reason
      }
    }
  }

  const lastMessage =
    lastError instanceof Error ? lastError.message : "No compatible Gemini model available";
  throw new Error(toUserFriendlyError(lastMessage));
}

function parseCarsFromResponse(text: string): ScannedCar[] {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) {
    throw new Error("Invalid AI response format");
  }

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as ScannedCar[];

  return parsed.map((car, index) => {
    const low = Number(car.priceLowUSD);
    const high = Number(car.priceHighUSD);
    const mid = Number(car.estimatedPriceUSD);
    const estimated =
      mid || (low && high ? (low + high) / 2 : low || high || 0);

    const confidence =
      car.priceConfidence === "high" ||
      car.priceConfidence === "medium" ||
      car.priceConfidence === "low"
        ? car.priceConfidence
        : "medium";

    return {
      id: String(car.id ?? index + 1),
      name: car.name ?? "Unknown Car",
      series: car.series ?? "Unknown",
      batchYear: car.batchYear ?? "Unknown",
      batch: car.batch || undefined,
      collectorNumber: car.collectorNumber || undefined,
      isTreasureHunt: Boolean(car.isTreasureHunt),
      isHotModel: Boolean(car.isHotModel),
      isOnWishlist: Boolean(car.isOnWishlist),
      estimatedPriceUSD: estimated,
      priceLowUSD: low || undefined,
      priceHighUSD: high || undefined,
      priceConfidence: confidence,
      recommendation: car.recommendation ?? "",
      story: car.story || undefined,
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const body = await request.json();
    const { imageBase64, mimeType = "image/jpeg", mode = "quick", wishlist = [] } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
    }

    const wishlistText =
      wishlist.length > 0 ? wishlist.join(", ") : "(none - no wishlist items)";

    const prompt = buildPrompt(mode, wishlistText);

    const responseText = await generateWithVision(
      apiKey,
      prompt,
      imageBase64,
      mimeType,
    );
    const cars = parseCarsFromResponse(responseText);

    return NextResponse.json({ cars });
  } catch (error) {
    console.error("Scan API error:", error);
    const message = error instanceof Error ? error.message : "Scan failed";
    return NextResponse.json({ error: toUserFriendlyError(message) }, { status: 500 });
  }
}
