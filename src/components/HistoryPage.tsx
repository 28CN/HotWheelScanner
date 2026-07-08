"use client";

import { useEffect, useState } from "react";
import { History, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { clearScanHistory, getScanHistory } from "@/lib/storage";
import type { ScanSession } from "@/types/scan";
import CarCard from "@/components/CarCard";

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setSessions(getScanHistory());
  }, []);

  function handleClear() {
    if (!confirm("确定清空所有扫描历史？")) return;
    clearScanHistory();
    setSessions([]);
    setExpanded(null);
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  return (
    <div className="px-4 pt-6">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">扫描历史</h1>
          <p className="mt-1 text-base text-zinc-400">
            最近 {sessions.length} 次扫描记录
          </p>
        </div>
        {sessions.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}
      </header>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-700 p-8 text-center">
          <History className="mx-auto mb-3 h-10 w-10 text-zinc-600" />
          <p className="text-base text-zinc-500">暂无扫描记录</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sessions.map((session) => {
            const isOpen = expanded === session.id;
            return (
              <li
                key={session.id}
                className="overflow-hidden rounded-2xl border-2 border-zinc-700 bg-zinc-900"
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(session.id)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  {session.imagePreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.imagePreview}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-white">
                      {session.cars.length} 辆车 ·{" "}
                      {session.mode === "quick" ? "快速扫雷" : "深度盘点"}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {formatDate(session.timestamp)}
                    </p>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5 shrink-0 text-zinc-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 shrink-0 text-zinc-400" />
                  )}
                </button>

                {isOpen && (
                  <div className="space-y-3 border-t border-zinc-700 p-4">
                    {session.cars.map((car, i) => (
                      <CarCard key={car.id} car={car} index={i} />
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
