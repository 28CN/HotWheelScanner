"use client";

import type { ScannedCar } from "@/types/scan";
import { Flame, Car, Star, BookOpen, Hash, Boxes } from "lucide-react";

interface CarCardProps {
  car: ScannedCar;
  index: number;
}

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "参考价 · 可信度高",
  medium: "参考价 · 中等",
  low: "参考价 · 仅供参考",
};

const CONFIDENCE_COLOR: Record<string, string> = {
  high: "text-emerald-400",
  medium: "text-amber-400",
  low: "text-zinc-500",
};

function isKnown(value: unknown): value is string | number {
  if (value == null) return false;
  const s = String(value).trim().toLowerCase();
  return s !== "" && s !== "unknown" && s !== "未知" && s !== "n/a";
}

export default function CarCard({ car, index }: CarCardProps) {
  const confidence = car.priceConfidence ?? "medium";
  const hasRange =
    car.priceLowUSD != null &&
    car.priceHighUSD != null &&
    car.priceHighUSD > car.priceLowUSD;

  const meta = [
    isKnown(car.series) ? car.series : null,
    isKnown(car.batchYear) ? car.batchYear : null,
  ].filter(Boolean);

  return (
    <article className="rounded-2xl border-2 border-zinc-700 bg-zinc-900 p-4">
      <div className="mb-2 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-black text-zinc-950">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold leading-tight text-white">{car.name}</h3>
          {meta.length > 0 && (
            <p className="mt-1 text-base text-zinc-400">{meta.join(" · ")}</p>
          )}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-zinc-500">
            {car.collectorNumber && (
              <span className="flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" />
                {car.collectorNumber}
              </span>
            )}
            {isKnown(car.batch) && (
              <span className="flex items-center gap-1">
                <Boxes className="h-3.5 w-3.5" />
                {car.batch}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          {hasRange ? (
            <span className="text-lg font-black leading-tight text-emerald-400">
              ${car.priceLowUSD!.toFixed(1)}–{car.priceHighUSD!.toFixed(1)}
            </span>
          ) : (
            <span className="text-xl font-black text-emerald-400">
              ${car.estimatedPriceUSD.toFixed(2)}
            </span>
          )}
          <p className={`mt-0.5 text-[11px] ${CONFIDENCE_COLOR[confidence]}`}>
            {CONFIDENCE_LABEL[confidence]}
          </p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {car.isTreasureHunt && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-xs font-bold text-zinc-950">
            <Flame className="h-3.5 w-3.5" />
            TH/STH
          </span>
        )}
        {car.isHotModel && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
            <Car className="h-3.5 w-3.5" />
            热门款
          </span>
        )}
        {car.isOnWishlist && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
            <Star className="h-3.5 w-3.5" />
            心愿单命中
          </span>
        )}
      </div>

      {car.recommendation && (
        <p className="text-base leading-relaxed text-zinc-300">{car.recommendation}</p>
      )}

      {car.story && (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-amber-300">
            <BookOpen className="h-4 w-4" />
            车款故事
          </p>
          <p className="text-base leading-relaxed text-zinc-300">{car.story}</p>
        </div>
      )}
    </article>
  );
}
