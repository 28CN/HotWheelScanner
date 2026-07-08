import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import type { ScannedCar } from "@/types/scan";

const BASE_PROMPT = `You are a world-class Hot Wheels / Matchbox die-cast appraiser. Your knowledge base is the Hot Wheels Fandom Wiki (https://hotwheels.fandom.com/wiki/Hot_Wheels), Hot Wheels Wiki collector guides, and eBay sold-listing data. Be precise and honest — never invent facts.

Carefully READ every legible text on the blister card and base: car name, collector number (e.g. "62/250"), series sub-line (e.g. "1/12"), copyright year, and "©20XX Mattel". Use these printed clues as the primary source of truth over your memory.

User wishlist keywords (set isOnWishlist=true only if the car name or make clearly matches a keyword):
{WISHLIST}

=== HOW TO READ BATCH / YEAR (very important, previous versions got this wrong) ===
- "batchYear" MUST be the actual model/release year of THIS specific casting, not a generic guess.
- Determine year from: the collector number range printed on the card, the card artwork style, and the copyright year on the base. A "©2025 Mattel" base usually means a 2026 line release, so weigh printed collector numbers heavily.
- "series" = the actual line/segment: "Mainline (Basic)", "HW <Segment> e.g. HW Race Day", "Car Culture", "Team Transport", "Premium", "Matchbox" etc. Read the segment name printed on the card if visible. Do NOT output vague values like "Mainline 2024" — put the series in "series" and the year in "batchYear" separately.
- If unsure of the exact year, give your best single year and lower priceConfidence to "low".

=== HOW TO PRICE (must be realistic & stable) ===
- Mainline/basic cars retail around $1.25–$1.50 USD. Loose/common secondary value is usually $1–$4. NEVER output a price below $1 for a real carded car, and NEVER below plausible retail.
- Premium / Car Culture / Team Transport: typically $8–$30.
- Treasure Hunt (TH): usually $5–$15. Super Treasure Hunt (STH, has real-rider rubber tires + TH flame logo): usually $15–$60+.
- Give a price RANGE, not a single fragile guess: priceLowUSD and priceHighUSD reflect realistic carded secondary-market value. estimatedPriceUSD = midpoint.
- Set priceConfidence: "high" if it's a well-known casting you can price confidently, "medium" if reasonable, "low" if you are guessing.

=== FIELDS (return each car as one JSON object) ===
- id: string (sequential "1", "2", "3"...)
- name: string (full casting name exactly as printed)
- series: string (line/segment only)
- batchYear: number (4-digit release year of THIS casting)
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
  return BASE_PROMPT.replace("{WISHLIST}", wishlistText)
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

async function generateWithVision(
  apiKey: string,
  prompt: string,
  imageBase64: string,
  mimeType: string,
) {
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: unknown;

  for (const modelName of DEFAULT_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType,
            data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
          },
        },
      ]);
      return result.response.text();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : "";
      if (!isRetryableModelError(message)) throw error;
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
