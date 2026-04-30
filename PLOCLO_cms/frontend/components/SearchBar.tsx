"use client";

import React, { useState, useEffect } from "react";
import { FaSearch } from "react-icons/fa";

interface SearchBarProps {
  placeholder?: string;
  onSearch: (value: string) => void; // ส่งค่าที่ debounce แล้วกลับไปที่ parent
  delay?: number; // กำหนดเวลา debounce (default 300ms)
  label?: string;
}

export default function SearchBar({
  placeholder,
  onSearch,
  delay = 500,
  label,
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    // ตั้งเวลาสำหรับ Debounce
    const timer = setTimeout(() => {
      onSearch(inputValue);
    }, delay);

    // ล้าง Timer เมื่อผู้ใช้พิมพ์ตัวอักษรถัดไป
    return () => clearTimeout(timer);
  }, [inputValue, delay, onSearch]);

  return (
    <div className="w-full space-y-2">
      {label && (
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
        <input
          type="text"
          placeholder={placeholder || "Search..."}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-orange-100 focus:border-orange-400 outline-none transition-all placeholder:text-slate-400 text-slate-700 shadow-inner"
        />
      </div>
    </div>
  );
}
