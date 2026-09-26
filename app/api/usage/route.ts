import { NextResponse } from "next/server";
import { parseUsageBody, type UsageRecord } from "@/src/rules/usageRecord";

export async function POST(request: Request) {
  const record = parseUsageBody(await request.json().catch(() => null));
  if (!record) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const stored = await insertUsage(record);
  return NextResponse.json({ ok: true, stored });
}

async function insertUsage(record: UsageRecord): Promise<boolean> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;

  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;

  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/usage_events`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      kind: record.kind,
      locale: record.locale,
      age_band: record.ageBand,
      care_level: record.careLevel,
      place: record.place,
      resident_tax: record.residentTax,
      ratio_status: record.ratioStatus,
      ratio: record.ratio,
      service_path: record.servicePath,
      rating: record.rating,
    }),
  });
  return response.ok;
}
