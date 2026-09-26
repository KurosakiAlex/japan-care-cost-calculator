import { NextResponse } from "next/server";

type FeedbackBody = {
  rating?: string;
  comment?: string;
  email?: string;
  includeInputs?: boolean;
  inputs?: unknown;
};

const RATINGS = new Set(["helpful", "unclear", "not_helpful"]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as FeedbackBody | null;
  if (!body || !body.rating || !RATINGS.has(body.rating)) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const comment = String(body.comment ?? "").slice(0, 2000);
  const email = String(body.email ?? "").slice(0, 200);
  const inputs = body.includeInputs ? body.inputs : undefined;
  const lines = [
    `rating: ${body.rating}`,
    `email: ${email || "(none)"}`,
    "",
    comment || "(no comment)",
    "",
    inputs ? `inputs: ${JSON.stringify(inputs)}` : "inputs: not included",
  ];
  const text = lines.join("\n");
  const to = process.env.FEEDBACK_TO_EMAIL ?? "";
  const key = process.env.RESEND_API_KEY;
  const subject = "介護費用の目安フィードバック";
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;

  if (!key || !to) {
    return NextResponse.json({ ok: false, fallback: "mailto", mailto });
  }

  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.FEEDBACK_FROM_EMAIL ?? "feedback@localhost",
      to: [to],
      reply_to: email || undefined,
      subject,
      text,
    }),
  });

  if (!sent.ok) {
    return NextResponse.json({ ok: false, fallback: "mailto", mailto });
  }
  return NextResponse.json({ ok: true });
}
