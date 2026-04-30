"use client";

import React from "react";
// Assuming you have access to Heroicons or similar SVG icons
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/20/solid";
import { useTranslation } from "react-i18next";

interface AlertPopupProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "info" | "confirm" | "error" | "success";
  onConfirm?: () => void;
  onCancel?: () => void;
}

export default function AlertPopup({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  type = "info",
  onConfirm,
  onCancel,
}: AlertPopupProps) {
  const { t } = useTranslation("common");
  // --- Utility Functions for Dynamic Styling ---
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircleIcon className="h-10 w-10 text-green-500" />;
      case "error":
        return <ExclamationCircleIcon className="h-10 w-10 text-red-500" />;
      case "confirm":
        return <ExclamationCircleIcon className="h-10 w-10 text-yellow-500" />;
      case "info":
      default:
        return <InformationCircleIcon className="h-10 w-10 text-blue-500" />;
    }
  };

  const getButtonClasses = (isPrimary: boolean) => {
    if (!isPrimary) {
      // Secondary/Cancel Button Style
      return "bg-gray-200 hover:bg-gray-300 text-gray-800 font-light px-4 py-2 rounded-lg transition-colors duration-150";
    }

    // Primary/Confirm Button Style based on type
    switch (type) {
      case "success":
        return "bg-green-600 hover:bg-green-700 text-white font-light px-4 py-2 rounded-lg transition-colors duration-150";
      case "error":
      case "confirm":
        return "bg-red-600 hover:bg-red-700 text-white font-light px-4 py-2 rounded-lg transition-colors duration-150";
      case "info":
      default:
        return "bg-blue-600 hover:bg-blue-700 text-white font-light px-4 py-2 rounded-lg transition-colors duration-150";
    }
  };
  // ---------------------------------------------

  if (!isOpen) return null;

  return (
    <div
      // 🟢 ปรับ z-index เป็น 10000 เพื่อให้อยู่เหนือ Loading (9999) และ Toast (9990)
      className="fixed inset-0 z-[9991] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        // 🟢 เพิ่ม transition เล็กน้อยเพื่อให้ดู Tidier
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center">
          {/* ... ส่วนเนื้อหา Icon, Title, Message ... */}

          <div className="mb-4">{getIcon()}</div>

          <h2 className="text-xl font-medium text-gray-900 mb-2 uppercase tracking-tight">
            {title || (type === "confirm" ? t("Confirm Action") : t("Notice"))}
          </h2>

          <p className="text-gray-500 font-light text-center mb-8 text-[14px] leading-relaxed">
            {message}
          </p>

          <div className="flex justify-center gap-3 w-full">
            {(type === "confirm" || onCancel) && (
              <button
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-light py-3 rounded-2xl transition-all active:scale-95"
                onClick={onCancel}
              >
                {cancelText || t("cancel")}
              </button>
            )}

            <button
              className={`flex-1 font-light py-3 rounded-2xl transition-all active:scale-95 text-white ${getButtonClasses(true)}`}
              onClick={onConfirm}
            >
              {confirmText || t("confirm")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
