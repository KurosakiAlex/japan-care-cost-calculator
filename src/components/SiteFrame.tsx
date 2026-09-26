"use client";

import Link from "next/link";
import { LanguageSwitch } from "./LanguageSwitch";
import { useI18n } from "./Providers";

export function SiteFrame({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto min-h-screen w-full max-w-lg px-4 py-5">
      <header className="mb-6 flex items-center justify-between gap-3">
        <Link href="/" className="text-sm font-semibold text-stone-800">
          {t.brand}
        </Link>
        <LanguageSwitch />
      </header>
      {children}
      <p className="mt-10 text-xs leading-5 text-stone-500">{t.footerNote}</p>
    </div>
  );
}
