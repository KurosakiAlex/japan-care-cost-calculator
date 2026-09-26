"use client";

import Link from "next/link";
import { LanguageSwitch } from "@/src/components/LanguageSwitch";
import { useI18n } from "@/src/components/Providers";
import { RULES } from "@/src/rules";

export default function SourcesPage() {
  const { t } = useI18n();
  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-4 py-5">
      <header className="mb-6 flex items-start justify-between gap-3">
        <Link href="/" className="text-sm font-semibold text-teal-900">
          {t.brand}
        </Link>
        <LanguageSwitch />
      </header>
      <h1 className="text-2xl font-semibold">{t.sourcesTitle}</h1>
      <p className="mt-3 text-sm leading-6">{t.sourcesIntro}</p>
      <div className="mt-6 space-y-6">
        {RULES.map((rule) => (
          <article key={rule.id} className="border-t border-stone-200 pt-4">
            <h2 className="text-base font-semibold">{rule.title}</h2>
            <p className="mt-1 text-sm">
              <a className="text-teal-900 underline" href={rule.sourceUrl}>
                {rule.sourceTitle}
              </a>
            </p>
            <p className="mt-1 text-sm text-stone-600">
              {t.effectiveFrom}: {rule.effectiveFrom}
            </p>
            <h3 className="mt-3 text-sm font-semibold">{t.officialLabel}</h3>
            <p className="mt-1 text-sm leading-6">{rule.official}</p>
            <h3 className="mt-3 text-sm font-semibold">{t.simplificationLabel}</h3>
            <p className="mt-1 text-sm leading-6">{rule.simplification}</p>
          </article>
        ))}
      </div>
      <p className="mt-8 text-sm leading-6">{t.checkedOn}</p>
      <p className="mt-2 text-sm leading-6">{t.officialNote}</p>
    </main>
  );
}
