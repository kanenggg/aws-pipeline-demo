"use client";
import React, { useState, useRef, useEffect } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

interface Option {
  label: string | number;
  value: string | number;
}
interface CustomDropdownProps {
  label?: string;
  value: string | number;
  onChange: (value: string | number) => void;
  options: Option[];
  disabled?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  label,
  value,
  onChange,
  options,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation("common");

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div
      className="relative w-full min-w-[200px] max-w-[400px]"
      ref={dropdownRef}
    >
      {label && (
        <p className="mb-1.5 text-[10px] font-light text-gray-400 uppercase tracking-widest">
          {label}
        </p>
      )}

      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          h-11 px-4 flex justify-between items-center bg-white border rounded-xl shadow-sm transition-all
          ${isOpen ? "ring-2 ring-orange-100 border-orange-400" : "border-gray-200"}
          ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "cursor-pointer hover:border-gray-300 text-gray-900"}
        `}
      >
        <span className="block truncate font-light text-sm">
          {selectedOption ? selectedOption.label : t("select_an_option")}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {isOpen && !disabled && (
        <ul className="absolute z-[100] mt-2 w-full bg-white shadow-2xl border border-gray-100 max-h-60 rounded-xl py-2 overflow-auto animate-in fade-in zoom-in duration-150">
          {options.length > 0 ? (
            options.map((opt) => (
              <li
                key={opt.value} // 🟢 แก้ไขเรื่อง Key undefined
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`cursor-pointer px-4 py-2.5 text-sm truncate hover:bg-orange-50 hover:text-orange-600 ${value === opt.value ? "text-orange-600 font-light bg-orange-50/50" : "text-gray-700"}`}
              >
                {opt.label}
              </li>
            ))
          ) : (
            <li className="px-4 py-8 text-center text-xs text-gray-400 italic">
              {t("no_options_available")}
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default CustomDropdown;
