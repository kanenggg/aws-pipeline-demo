"use client";

import { useTranslation } from "react-i18next";
import { useState, useRef, useEffect } from "react";
import Image from "next/image"; // Import Next.js Image component

const LANGUAGES = [
  { code: "th", labelKey: "ไทย", flag: "/images/flags/thailand.png" },
  { code: "en", labelKey: "English", flag: "/images/flags/united-states.png" },
  // { code: "jp", labelKey: "日本語", flag: "/images/flags/japan.png" },
  // { code: "zh", labelKey: "中文", flag: "/images/flags/china.png" },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false); // State to manage dropdown visibility
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang =
    LANGUAGES.find((lang) => lang.code === i18n.language) || LANGUAGES[0];

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false); // Close dropdown after selection
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-block text-left z-50" ref={dropdownRef}>
      {/* --- 1. Display Button (Now at the bottom of its parent using mt-auto) --- */}
      <button
        type="button"
        className="inline-flex justify-center items-center w-[140px] px-4 py-2 text-sm font-light text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-100 mt-auto focus:outline-none cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Image
          src={currentLang.flag}
          alt={currentLang.labelKey}
          width={20}
          height={15}
          className="mr-2 rounded-sm"
        />
        {currentLang.labelKey}
      </button>

      {/* --- 2. Custom Dropdown Menu (REVERSED POSITIONING) --- */}
      {isOpen && (
        <div className="absolute bottom-full mb-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
          <ul
            className="py-1"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="menu-button"
          >
            {LANGUAGES.map((lang) => (
              <li
                key={lang.code}
                className={`flex items-center px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                  i18n.language === lang.code ? "bg-gray-200 font-light" : ""
                }`}
                onClick={() => changeLanguage(lang.code)}
              >
                <Image
                  src={lang.flag}
                  alt={lang.labelKey}
                  width={20}
                  height={15}
                  className="mr-2 rounded-sm"
                />
                {lang.labelKey}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
