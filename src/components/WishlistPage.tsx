"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Star } from "lucide-react";
import { getWishlist, saveWishlist } from "@/lib/storage";

export default function WishlistPage() {
  const [items, setItems] = useState<string[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    setItems(getWishlist());
  }, []);

  function addItem() {
    const trimmed = input.trim();
    if (!trimmed || items.includes(trimmed)) return;
    const updated = [...items, trimmed];
    setItems(updated);
    saveWishlist(updated);
    setInput("");
  }

  function removeItem(tag: string) {
    const updated = items.filter((i) => i !== tag);
    setItems(updated);
    saveWishlist(updated);
  }

  return (
    <div className="px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-3xl font-black text-white">心愿单</h1>
        <p className="mt-1 text-base text-zinc-400">
          添加车名或标签，扫描时自动匹配高亮
        </p>
      </header>

      <div className="mb-6 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder='如 "Skyline", "Ferrari"'
          className="flex-1 rounded-xl border-2 border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-white placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={addItem}
          className="flex items-center justify-center rounded-xl bg-amber-500 px-4 text-zinc-950 hover:bg-amber-400"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-700 p-8 text-center">
          <Star className="mx-auto mb-3 h-10 w-10 text-zinc-600" />
          <p className="text-base text-zinc-500">还没有心愿单项目</p>
          <p className="mt-1 text-sm text-zinc-600">
            输入车名关键词，扫描时自动标记命中
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((tag) => (
            <li
              key={tag}
              className="flex items-center justify-between rounded-xl border-2 border-zinc-700 bg-zinc-900 px-4 py-3"
            >
              <span className="flex items-center gap-2 text-base font-semibold text-white">
                <Star className="h-4 w-4 fill-emerald-500 text-emerald-500" />
                {tag}
              </span>
              <button
                type="button"
                onClick={() => removeItem(tag)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
