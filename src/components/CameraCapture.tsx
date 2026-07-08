"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Camera, SwitchCamera, Check, RotateCcw } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [flash, setFlash] = useState(false);

  // Captured photo pending confirmation
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const pendingFileRef = useRef<File | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  const startCamera = useCallback(
    async (facing: "environment" | "user") => {
      stopStream();
      setError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("当前浏览器不支持相机，请使用「从相册选择」");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          setReady(true);
        }
      } catch {
        setError("无法访问相机，请授予摄像头权限或使用相册上传");
      }
    },
    [stopStream],
  );

  useEffect(() => {
    if (previewUrl) return; // don't restart camera while reviewing
    startCamera(facingMode);
    return stopStream;
  }, [facingMode, startCamera, stopStream, previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !ready || video.videoWidth === 0) return;

    // shutter flash feedback
    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `scan-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        pendingFileRef.current = file;
        setPreviewUrl(URL.createObjectURL(blob));
        stopStream();
      },
      "image/jpeg",
      0.92,
    );
  }

  function confirmPhoto() {
    const file = pendingFileRef.current;
    if (!file) return;
    onCapture(file);
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    pendingFileRef.current = null;
    setPreviewUrl(null);
  }

  function handleClose() {
    stopStream();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onClose();
  }

  function toggleCamera() {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }

  // === Review screen: confirm or retake ===
  if (previewUrl) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-black">
        <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full bg-zinc-800/80 p-2 text-white active:scale-90"
            aria-label="关闭"
          >
            <X className="h-6 w-6" />
          </button>
          <span className="text-base font-bold text-white">确认这张照片？</span>
          <span className="w-10" />
        </div>

        <div className="relative flex-1 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="拍摄预览"
            className="h-full w-full object-contain"
          />
        </div>

        <div className="flex items-center justify-around gap-4 px-6 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={retake}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-zinc-500 py-4 text-lg font-bold text-white active:scale-95"
          >
            <RotateCcw className="h-6 w-6" />
            重拍
          </button>
          <button
            type="button"
            onClick={confirmPhoto}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-500 py-4 text-lg font-black text-zinc-950 active:scale-95"
          >
            <Check className="h-6 w-6" />
            确认识别
          </button>
        </div>
      </div>
    );
  }

  // === Camera live screen ===
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      {flash && <div className="absolute inset-0 z-10 bg-white opacity-70" />}

      <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={handleClose}
          className="rounded-full bg-zinc-800/80 p-2 text-white active:scale-90"
          aria-label="关闭相机"
        >
          <X className="h-6 w-6" />
        </button>
        <span className="text-base font-bold text-white">对准小车拍照</span>
        <button
          type="button"
          onClick={toggleCamera}
          className="rounded-full bg-zinc-800/80 p-2 text-white active:scale-90"
          aria-label="切换摄像头"
        >
          <SwitchCamera className="h-6 w-6" />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {error ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-base text-red-300">
            {error}
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        )}
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-base text-zinc-300">
            相机启动中…
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={takePhoto}
          disabled={!ready || !!error}
          className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-amber-500 text-zinc-950 transition-transform active:scale-90 disabled:opacity-40"
          aria-label="拍照"
        >
          <Camera className="h-8 w-8" />
        </button>
        <span className="text-sm text-zinc-400">
          {ready ? "稳定后点击拍照，可预览确认" : "等待画面稳定…"}
        </span>
      </div>
    </div>
  );
}
