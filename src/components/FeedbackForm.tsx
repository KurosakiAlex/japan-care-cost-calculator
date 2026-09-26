"use client";

import { useEffect, useState } from "react";
import type { EstimateResult } from "@/src/rules/estimate";
import type { EstimateInput } from "@/src/rules/types";
import { buildUsageRecord, usageFingerprint, type UsageRating } from "@/src/rules/usageRecord";
import { useI18n } from "./Providers";

const RESULT_PREFIX = "kaigo-usage-result:";
const RATING_PREFIX = "kaigo-usage-rating:";

export function FeedbackForm({ input, result }: { input: EstimateInput; result: EstimateResult }) {
  const { t, locale } = useI18n();
  const [rating, setRating] = useState<UsageRating | null>(null);
  const [noted, setNoted] = useState(false);

  useEffect(() => {
    const record = buildUsageRecord(input, result, locale, null);
    const key = RESULT_PREFIX + usageFingerprint(record);
    if (window.sessionStorage.getItem(key)) return;
    let cancelled = false;
    void fetch("/api/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    })
      .then((response) => {
        if (response.ok && !cancelled) window.sessionStorage.setItem(key, "1");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [input, result, locale]);

  function choose(next: UsageRating) {
    setRating(next);
    setNoted(true);
    const record = buildUsageRecord(input, result, locale, next);
    const key = RATING_PREFIX + usageFingerprint(record);
    if (window.sessionStorage.getItem(key)) return;
    void fetch("/api/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    })
      .then((response) => {
        if (response.ok) window.sessionStorage.setItem(key, next);
      })
      .catch(() => undefined);
  }

  const choices: Array<{ id: UsageRating; label: string }> = [
    { id: "helpful", label: t.feedbackHelpful },
    { id: "unclear", label: t.feedbackUnclear },
    { id: "not_helpful", label: t.feedbackNo },
  ];

  return (
    <section className="mt-8 border-t border-stone-200 pt-6">
      <h2 className="text-base font-semibold">{t.feedbackTitle}</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">{t.feedbackNote}</p>
      <div className="mt-3 grid gap-2">
        {choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => choose(choice.id)}
            className={choiceClass(rating === choice.id)}
          >
            {choice.label}
          </button>
        ))}
      </div>
      {noted ? <p className="mt-3 text-sm text-teal-900">{t.feedbackThanks}</p> : null}
    </section>
  );
}

function choiceClass(selected: boolean): string {
  return selected
    ? "rounded border border-teal-800 bg-teal-50 px-3 py-3 text-left"
    : "rounded border border-stone-300 bg-white px-3 py-3 text-left";
}
