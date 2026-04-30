import i18n from "i18next";
import { initReactI18next } from "react-i18next";
// 💡 Import the Language Detector
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "./locales/en/common.json";
import thCommon from "./locales/th/common.json";

// 💡 Use the LanguageDetector plugin
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // 💡 REMOVED: lng: "th", // Detector will find the last saved language

    // Use a persistent fallback language
    fallbackLng: "th",

    // 💡 Configuration for the detector
    detection: {
      // Order of detection: cookie, localStorage, browser language
      order: ["localStorage", "navigator"],
      // Key to use when storing the language
      lookupLocalStorage: "i18nextLng",
      // Caches the language in localStorage
      caches: ["localStorage"],
    },

    debug: true,
    interpolation: { escapeValue: false },
    resources: {
      en: { common: enCommon },
      th: { common: thCommon },
    },
  });

export default i18n;
