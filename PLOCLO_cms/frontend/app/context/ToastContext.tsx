"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import { Toast } from "@/components/Toast"; // ตัว Component Toast ที่เราทำกันไว้

type ToastType = "success" | "error";
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const close = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success", duration = 5000) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type, duration }]);
      // ตั้งเวลาปิดอัตโนมัติ (หรือจะให้ปิดใน Component Toast ก็ได้)
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* 🟢 ย้ายการแสดงผล Toast ทั้งหมดมาไว้ที่นี่ที่เดียว */}
      <div className="fixed bottom-6 right-6 z-[9990] flex flex-col-reverse gap-3 w-full max-w-sm pointer-events-none">
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
    </ToastContext.Provider>
  );
};

export const useGlobalToast = () => {
  const context = useContext(ToastContext);
  if (!context)
    throw new Error("useGlobalToast must be used within ToastProvider");
  return context;
};
