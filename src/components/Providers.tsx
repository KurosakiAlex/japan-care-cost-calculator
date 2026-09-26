"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { MESSAGES } from "@/src/i18n";
import type { Locale, Messages } from "@/src/i18n/types";

const STORAGE_KEY = "kaigo-locale";

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
};

const I18nContext = createContext<I18nValue | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ja");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "ja" || saved === "en" || saved === "zh") {
      setLocaleState(saved);
      document.documentElement.lang = saved === "zh" ? "zh-CN" : saved;
    }
  }, []);

  const value = useMemo<I18nValue>(() => {
    return {
      locale,
      t: MESSAGES[locale],
      setLocale: (next) => {
        setLocaleState(next);
        window.localStorage.setItem(STORAGE_KEY, next);
        document.documentElement.lang = next === "zh" ? "zh-CN" : next;
      },
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used within Providers");
  return value;
}
