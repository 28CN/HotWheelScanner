"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Camera, SwitchCamera } from "lucide-react";

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
    startCamera(facingMode);
    return stopStream;
  }, [facingMode, startCamera, stopStream]);

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !ready) return;

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
        stopStream();
        onCapture(file);
      },
      "image/jpeg",
      0.92,
    );
  }

  function handleClose() {
    stopStream();
    onClose();
  }

  function toggleCamera() {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={handleClose}
          className="rounded-full bg-zinc-800/80 p-2 text-white"
          aria-label="关闭相机"
        >
          <X className="h-6 w-6" />
        </button>
        <span className="text-base font-bold text-white">对准小车拍照</span>
        <button
          type="button"
          onClick={toggleCamera}
          className="rounded-full bg-zinc-800/80 p-2 text-white"
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
      </div>

      <div className="flex justify-center py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={takePhoto}
          disabled={!ready || !!error}
          className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-amber-500 text-zinc-950 disabled:opacity-40"
          aria-label="拍照"
        >
          <Camera className="h-8 w-8" />
        </button>
      </div>
    </div>
  );
}
