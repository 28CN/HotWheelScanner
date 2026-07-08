"use client";

import type { ScannedCar } from "@/types/scan";
import { Flame, Car, Star } from "lucide-react";

interface CarCardProps {
  car: ScannedCar;
  index: number;
}

export default function CarCard({ car, index }: CarCardProps) {
  return (
    <article className="rounded-2xl border-2 border-zinc-700 bg-zinc-900 p-4">
      <div className="mb-2 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-black text-zinc-950">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold leading-tight text-white">{car.name}</h3>
          <p className="mt-1 text-base text-zinc-400">
            {car.series} · {car.batchYear}
          </p>
        </div>
        <span className="shrink-0 text-xl font-black text-emerald-400">
          ${car.estimatedPriceUSD.toFixed(2)}
        </span>
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
    </article>
  );
}
