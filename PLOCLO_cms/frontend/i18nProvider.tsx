"use client";

import { ReactNode, useEffect } from "react";
import i18n from "./i18n"; // i18n.ts
import { I18nextProvider } from "react-i18next";

interface Props {
  children: ReactNode;
}

export default function I18nProvider({ children }: Props) {
  useEffect(() => {
    // client-side init only
    if (!i18n.isInitialized) {
      i18n.init();
    }
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
