"use client";

import { useState } from "react";
import { useI18n } from "./Providers";

type Rating = "helpful" | "unclear" | "not_helpful";

export function FeedbackForm({ inputs }: { inputs?: unknown }) {
  const { t } = useI18n();
  const [rating, setRating] = useState<Rating | null>(null);
  const [comment, setComment] = useState("");
  const [email, setEmail] = useState("");
  const [includeInputs, setIncludeInputs] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "mailto">("idle");
  const [mailto, setMailto] = useState("");

  async function submit() {
    if (!rating) return;
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating,
        comment,
        email,
        includeInputs,
        inputs: includeInputs ? inputs : undefined,
      }),
    });
    const data = (await response.json()) as { ok?: boolean; mailto?: string };
    if (data.ok) {
      setStatus("sent");
      return;
    }
    setMailto(data.mailto ?? "");
    setStatus("mailto");
  }

  const choices: Array<{ id: Rating; label: string }> = [
    { id: "helpful", label: t.feedbackHelpful },
    { id: "unclear", label: t.feedbackUnclear },
    { id: "not_helpful", label: t.feedbackNo },
  ];

  return (
    <section className="mt-8 border-t border-stone-200 pt-6">
      <h2 className="text-base font-semibold">{t.feedbackTitle}</h2>
      <div className="mt-3 grid gap-2">
        {choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => setRating(choice.id)}
            className={choiceClass(rating === choice.id)}
          >
            {choice.label}
          </button>
        ))}
      </div>
      <label className="mt-4 block text-sm">
        {t.feedbackComment}
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded border border-stone-300 bg-white p-2"
        />
      </label>
      <label className="mt-3 block text-sm">
        {t.feedbackEmail}
        <span className="ml-2 text-stone-500">{t.feedbackEmailHint}</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded border border-stone-300 bg-white p-2"
        />
      </label>
      <label className="mt-3 flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={includeInputs}
          onChange={(event) => setIncludeInputs(event.target.checked)}
          className="mt-1"
        />
        <span>{t.feedbackInclude}</span>
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={!rating}
        className="mt-4 w-full rounded bg-teal-800 px-4 py-3 text-white disabled:bg-stone-300"
      >
        {t.feedbackSend}
      </button>
      {status === "sent" ? <p className="mt-3 text-sm text-teal-900">{t.feedbackThanks}</p> : null}
      {status === "mailto" && mailto ? (
        <a className="mt-3 block text-sm text-teal-900 underline" href={mailto}>
          {t.feedbackMailto}
        </a>
      ) : null}
    </section>
  );
}

function choiceClass(selected: boolean): string {
  return selected
    ? "rounded border border-teal-800 bg-teal-50 px-3 py-3 text-left"
    : "rounded border border-stone-300 bg-white px-3 py-3 text-left";
}
