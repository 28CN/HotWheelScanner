import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import type { ScannedCar } from "@/types/scan";

const SYSTEM_PROMPT = `You are an expert Hot Wheels toy car appraiser and collector assistant.

Analyze the provided image of Hot Wheels die-cast cars. Identify each visible car and provide accurate details.

User wishlist keywords (mark isOnWishlist=true if car name/series matches any keyword):
{WISHLIST}

Scan mode: {MODE}
- quick: Expect 1 car, focus on single vehicle details
- deep: Expect multiple cars laid flat together, identify ALL visible cars left-to-right, top-to-bottom

For each car return a JSON object with these exact fields:
- id: string (sequential "1", "2", "3"...)
- name: string (full car name)
- series: string (e.g. "Mainline", "Car Culture", "Premium")
- batchYear: number or string (release year/batch like 2025, 2026)
- isTreasureHunt: boolean (true for TH or STH Treasure Hunt/Super Treasure Hunt)
- isHotModel: boolean (true for premium collectibles: Ferrari, Porsche, Skyline/GTR, Lamborghini, McLaren, etc.)
- isOnWishlist: boolean (true if matches any wishlist keyword)
- estimatedPriceUSD: number (realistic secondary market price in USD)
- recommendation: string (brief buying advice in Chinese, 1-2 sentences)

Respond ONLY with a valid JSON array. No markdown, no explanation. Example:
[{"id":"1","name":"'71 Porsche 911","series":"Mainline","batchYear":2025,"isTreasureHunt":false,"isHotModel":true,"isOnWishlist":false,"estimatedPriceUSD":3.5,"recommendation":"热门保时捷款，值得收藏"}]`;

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

  return parsed.map((car, index) => ({
    id: String(car.id ?? index + 1),
    name: car.name ?? "Unknown Car",
    series: car.series ?? "Unknown",
    batchYear: car.batchYear ?? "Unknown",
    isTreasureHunt: Boolean(car.isTreasureHunt),
    isHotModel: Boolean(car.isHotModel),
    isOnWishlist: Boolean(car.isOnWishlist),
    estimatedPriceUSD: Number(car.estimatedPriceUSD) || 0,
    recommendation: car.recommendation ?? "",
  }));
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

    const prompt = SYSTEM_PROMPT.replace("{WISHLIST}", wishlistText).replace(
      "{MODE}",
      mode === "deep" ? "deep (multi-car inventory)" : "quick (single car)",
    );

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
