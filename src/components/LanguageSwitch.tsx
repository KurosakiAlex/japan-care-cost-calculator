"use client";

import { useI18n } from "./Providers";
import type { Locale } from "@/src/i18n/types";

const OPTIONS: Array<{ id: Locale; label: string }> = [
  { id: "ja", label: "日本語" },
  { id: "en", label: "English" },
  { id: "zh", label: "中文" },
];

export function LanguageSwitch() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="flex gap-1 text-sm">
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => setLocale(option.id)}
          className={
            option.id === locale
              ? "rounded px-2 py-1 font-semibold text-teal-900"
              : "rounded px-2 py-1 text-stone-500"
          }
          aria-pressed={option.id === locale}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
