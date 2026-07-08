"use client";

import { useRef, useState } from "react";
import { Camera, ImageIcon, Zap, Layers, Loader2 } from "lucide-react";
import type { ScanMode, ScannedCar } from "@/types/scan";
import { getWishlist, saveScanSession } from "@/lib/storage";
import ScanResults from "@/components/ScanResults";

export default function ScannerPage() {
  const [mode, setMode] = useState<ScanMode>("quick");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cars, setCars] = useState<ScannedCar[] | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  async function handleImageFile(file: File) {
    setError(null);
    setCars(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);

      const base64 = dataUrl.split(",")[1];
      const mimeType = file.type || "image/jpeg";

      try {
        const wishlist = getWishlist();
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType,
            mode,
            wishlist,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "扫描失败");

        setCars(data.cars);

        saveScanSession({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          mode,
          imagePreview: dataUrl,
          cars: data.cars,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "扫描失败，请重试");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    e.target.value = "";
  }

  function resetScan() {
    setCars(null);
    setImagePreview(null);
    setError(null);
  }

  return (
    <div className="px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-white">
          风火轮扫描器
        </h1>
        <p className="mt-1 text-base text-zinc-400">AI 视觉辅助淘货神器</p>
      </header>

      {!cars && (
        <>
          <div className="mb-5 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 p-4">
            <p className="text-base font-semibold leading-relaxed text-amber-200">
              💡 技巧：请将小车平放或叠放于桌面/推车内，保证光线充足并能看清卡片底部文字，AI
              识别率极高！
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode("quick")}
              className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-colors ${
                mode === "quick"
                  ? "border-amber-500 bg-amber-500/20 text-amber-300"
                  : "border-zinc-700 bg-zinc-900 text-zinc-400"
              }`}
            >
              <Zap className="h-8 w-8" />
              <span className="text-base font-bold">快速扫雷模式</span>
              <span className="text-xs text-zinc-500">拍单车</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("deep")}
              className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-colors ${
                mode === "deep"
                  ? "border-amber-500 bg-amber-500/20 text-amber-300"
                  : "border-zinc-700 bg-zinc-900 text-zinc-400"
              }`}
            >
              <Layers className="h-8 w-8" />
              <span className="text-base font-bold">深度盘点模式</span>
              <span className="text-xs text-zinc-500">多车合影</span>
            </button>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => cameraInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-amber-500 py-5 text-lg font-black text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Camera className="h-6 w-6" />
              )}
              {loading ? "AI 识别中..." : "启动相机拍照"}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => galleryInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-zinc-600 bg-zinc-900 py-5 text-lg font-bold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              <ImageIcon className="h-6 w-6" />
              从相册选择
            </button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFileChange}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
          />
        </>
      )}

      {error && (
        <div className="mt-4 rounded-xl border-2 border-red-600 bg-red-950 p-4 text-base font-semibold text-red-300">
          {error}
        </div>
      )}

      {cars && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={resetScan}
            className="w-full rounded-xl border-2 border-zinc-600 py-3 text-base font-bold text-zinc-300 hover:bg-zinc-800"
          >
            ← 重新扫描
          </button>
          <ScanResults cars={cars} imagePreview={imagePreview ?? undefined} />
        </div>
      )}
    </div>
  );
}
