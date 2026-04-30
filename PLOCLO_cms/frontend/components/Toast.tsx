"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";

type ToastType = "success" | "error";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

// --- Component: Individual Toast with Pause Logic ---
export function Toast({
  message,
  type = "success",
  onClose,
  duration = 5000,
}: {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const remainingTimeRef = useRef(duration);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (isPaused) return;

    const tick = setInterval(() => {
      remainingTimeRef.current -= 50; // ลดเวลาทีละ 50ms ตามช่วง Interval
      const percent = Math.max((remainingTimeRef.current / duration) * 100, 0);
      setProgress(percent);

      if (remainingTimeRef.current <= 0) {
        clearInterval(tick);
        onClose();
      }
    }, 50);

    return () => clearInterval(tick);
  }, [isPaused, duration, onClose]);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`relative z-50 max-w-sm w-full rounded-2xl shadow-2xl border px-4 py-4 flex flex-col transition-all duration-300 animate-slide-in overflow-hidden cursor-default
      ${type === "success" ? "bg-white border-green-100 shadow-green-100/30" : "bg-white border-red-100 shadow-red-100/30"}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 pt-0.5">
          {type === "success" ? (
            <CheckCircleIcon className="h-6 w-6 text-green-500" />
          ) : (
            <XCircleIcon className="h-6 w-6 text-red-500" />
          )}
        </div>

        <div className="flex-1 mt-0.5 text-sm font-light text-slate-700 leading-relaxed">
          {message}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation(); // กันการ Trigger MouseLeave
            onClose();
          }}
          className="ml-2 flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Subtle Progress Bar */}
      {/* <div className="absolute bottom-0 left-0 w-full h-1.5 bg-slate-50">
        <div
          className={`h-full transition-all duration-75 ease-linear ${
            type === "success" ? "bg-green-500" : "bg-red-500"
          } ${isPaused ? "opacity-40" : "opacity-100"}`}
          style={{ width: `${progress}%` }}
        />
      </div> */}
    </div>
  );
}

// --- Hook: useToast ---
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const close = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success", duration = 5000) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type, duration }]);
    },
    [],
  );

  const ToastElement = () => (
    <div
      // 🟢 ปรับลด z-index ลงมาเหลือ 9990 หรือ 9998 (ต้องน้อยกว่า Loading)
      className="fixed bottom-6 right-6 z-[9990] flex flex-col-reverse gap-3 w-full max-w-sm pointer-events-none"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast
            message={t.message}
            type={t.type}
            duration={t.duration}
            onClose={() => close(t.id)}
          />
        </div>
      ))}
    </div>
  );

  return { showToast, ToastElement } as const;
}
