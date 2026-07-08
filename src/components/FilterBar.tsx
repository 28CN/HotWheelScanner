"use client";

import type { FilterType } from "@/types/scan";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "全部车款" },
  { key: "price", label: "💰 估价 > $5" },
  { key: "hot", label: "🔥 重点关注" },
  { key: "recent", label: "📅 2025/2026 批次" },
];

interface FilterBarProps {
  active: FilterType;
  onChange: (filter: FilterType) => void;
}

export default function FilterBar({ active, onChange }: FilterBarProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {FILTERS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
            active === key
              ? "bg-amber-500 text-zinc-950"
              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
