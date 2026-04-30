"use client";

import { ReactNode } from "react";
import I18nProvider from "../i18nProvider";

export default function I18nProviderWrapper({
  children,
}: {
  children: ReactNode;
}) {
  return <I18nProvider>{children}</I18nProvider>;
}
