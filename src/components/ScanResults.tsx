"use client";

import type { ScannedCar, FilterType } from "@/types/scan";
import FilterBar from "@/components/FilterBar";
import CarCard from "@/components/CarCard";
import ImageWithMarkers from "@/components/ImageWithMarkers";
import { useMemo, useState } from "react";

function applyFilter(cars: ScannedCar[], filter: FilterType): ScannedCar[] {
  switch (filter) {
    case "price":
      return cars.filter((c) => c.estimatedPriceUSD > 5);
    case "hot":
      return cars.filter(
        (c) => c.isTreasureHunt || c.isHotModel || c.isOnWishlist,
      );
    case "recent":
      return cars.filter((c) => {
        const year = String(c.batchYear);
        return year.includes("2025") || year.includes("2026");
      });
    default:
      return cars;
  }
}

interface ScanResultsProps {
  cars: ScannedCar[];
  imagePreview?: string;
}

export default function ScanResults({ cars, imagePreview }: ScanResultsProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const filtered = useMemo(() => applyFilter(cars, filter), [cars, filter]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-white">
          识别结果 ({cars.length} 辆)
        </h2>
      </div>

      <FilterBar active={filter} onChange={setFilter} />

      {imagePreview && (
        <ImageWithMarkers imageSrc={imagePreview} count={cars.length} />
      )}

      {filtered.length === 0 ? (
        <p className="rounded-xl bg-zinc-800 p-4 text-center text-base text-zinc-400">
          当前筛选条件下没有匹配的车款
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((car, i) => (
            <CarCard key={car.id} car={car} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
