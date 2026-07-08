"use client";

interface ImageWithMarkersProps {
  imageSrc: string;
  count: number;
}

export default function ImageWithMarkers({ imageSrc, count }: ImageWithMarkersProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-zinc-700">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt="扫描原图"
        className="w-full object-contain max-h-64 bg-zinc-800"
      />
      <div className="flex flex-wrap gap-2 border-t border-zinc-700 bg-zinc-900 p-3">
        <span className="text-sm font-semibold text-zinc-400">车辆顺序：</span>
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-sm font-black text-zinc-950"
          >
            {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}
