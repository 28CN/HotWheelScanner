export interface CompressedImage {
  dataUrl: string; // full data URL for preview
  base64: string; // base64 payload without prefix
  mimeType: string;
}

/**
 * Downscale + re-encode an image to keep the upload payload small enough for
 * serverless request limits (Vercel caps request bodies at ~4.5MB). Gallery
 * photos are often 5-12MB originals, so we resize to a max edge and re-encode
 * as JPEG before sending to the API.
 */
export async function compressImage(
  file: File,
  maxEdge = 1600,
  quality = 0.82,
): Promise<CompressedImage> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await loadImage(objectUrl);

    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("无法处理图片");
    }
    ctx.drawImage(img, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const base64 = dataUrl.split(",")[1] ?? "";

    return { dataUrl, base64, mimeType: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = src;
  });
}
