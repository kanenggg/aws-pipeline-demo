"use client";

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";

type FieldType = "text" | "email" | "select" | "number";

interface FieldConfig<T> {
  label: string;
  key: keyof T;
  type: FieldType;
  options?: string[]; // for select
}

interface FormEditPopupProps<T> {
  title: string;
  data: T;
  fields: FieldConfig<T>[];
  onChange: (updated: T) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function FormEditPopup<T>({
  title,
  data,
  fields,
  onChange,
  onSave,
  onClose,
}: FormEditPopupProps<T>) {
  const { t } = useTranslation("common");
  // 1. Lock the background scroll when the popup opens
  useEffect(() => {
    // Disable scrolling on the body
    document.body.style.overflow = "hidden";

    // Re-enable scrolling when component unmounts (closes)
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const adjustHeight = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 w-[700px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-light mb-4">{title}</h2>

        {fields.map((field) => (
          <div key={String(field.key)} className="mb-4">
            <label className="block mb-1 text-sm font-light text-gray-700">
              {field.label}
            </label>

            {/* TEXT / EMAIL / NUMBER INPUT */}
            {(field.type === "text" ||
              field.type === "email" ||
              field.type === "number") && (
              <textarea
                rows={1}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-1 focus:ring-orange-500  outline-none transition-all resize-none overflow-hidden font-light"
                value={String(data[field.key] ?? "")}
                onChange={(e) => {
                  onChange({ ...data, [field.key]: e.target.value });
                  adjustHeight(e.target);
                }}
                // Adjust height on initial render
                ref={(textarea) => {
                  if (textarea) adjustHeight(textarea);
                }}
              />
            )}

            {/* SELECT INPUT */}
            {field.type === "select" && (
              <select
                className="w-full border font-light border-gray-300 rounded-lg px-4 py-3 focus:ring-1 focus:ring-orange-500 outline-none transition-all resize-none overflow-hidden  "
                value={String(data[field.key] ?? "")}
                onChange={(e) =>
                  onChange({ ...data, [field.key]: e.target.value })
                }
              >
                {field.options?.map((opt) => (
                  <option key={opt} value={opt} className="font-light">
                    {opt}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="bg-gray-400 font-light hover:bg-gray-500 cursor-pointer text-white px-3 py-1 rounded"
          >
            {t("Cancel")}
          </button>
          <button
            onClick={onSave}
            className="bg-green-500 font-light hover:bg-green-600 cursor-pointer text-white px-3 py-1 rounded"
          >
            {t("Save")}
          </button>
        </div>
      </div>
    </div>
  );
}
