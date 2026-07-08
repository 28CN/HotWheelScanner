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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
        },
      },
    ]);

    const responseText = result.response.text();
    const cars = parseCarsFromResponse(responseText);

    return NextResponse.json({ cars });
  } catch (error) {
    console.error("Scan API error:", error);
    const message = error instanceof Error ? error.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
