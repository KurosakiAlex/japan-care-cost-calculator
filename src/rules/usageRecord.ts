import type { EstimateResult } from "./estimate";
import type { AgeBand, CareLevel, EstimateInput, Place, Ratio, ResidentTax } from "./types";

export type UsageLocale = "ja" | "en" | "zh";
export type UsageKind = "result" | "rating";
export type UsageRating = "helpful" | "unclear" | "not_helpful";
export type ServicePath = "paid" | "gross" | "preset" | "skip";
export type RatioStatus = "single" | "range" | "undetermined";

/** Categories only. Amounts, email, and free text are never fields of this record. */
export type UsageRecord = {
  kind: UsageKind;
  locale: UsageLocale;
  ageBand: AgeBand;
  careLevel: CareLevel;
  place: Place;
  residentTax: ResidentTax;
  ratioStatus: RatioStatus;
  ratio: Ratio | null;
  servicePath: ServicePath;
  rating: UsageRating | null;
};

const LOCALES = new Set<UsageLocale>(["ja", "en", "zh"]);
const KINDS = new Set<UsageKind>(["result", "rating"]);
const RATINGS = new Set<UsageRating>(["helpful", "unclear", "not_helpful"]);
const AGES = new Set<AgeBand>(["40-64", "65plus", "unknown"]);
const LEVELS = new Set<CareLevel>([
  "support1",
  "support2",
  "care1",
  "care2",
  "care3",
  "care4",
  "care5",
  "unknown",
]);
const PLACES = new Set<Place>(["home", "facility", "undecided"]);
const TAXES = new Set<ResidentTax>(["taxable", "exempt", "unknown"]);
const PATHS = new Set<ServicePath>(["paid", "gross", "preset", "skip"]);
const STATUSES = new Set<RatioStatus>(["single", "range", "undetermined"]);
const RATIOS = new Set<Ratio>([10, 20, 30]);

export function servicePathOf(input: EstimateInput): ServicePath {
  if (input.serviceFeeYen != null && input.serviceAmountKind === "paid") return "paid";
  if (input.serviceFeeYen != null && input.serviceAmountKind === "gross") return "gross";
  if (input.place !== "facility" && input.usagePreset) return "preset";
  return "skip";
}

export function buildUsageRecord(
  input: EstimateInput,
  result: EstimateResult,
  locale: UsageLocale,
  rating: UsageRating | null,
): UsageRecord {
  const single = result.decision.status === "single" && result.decision.ratios.length === 1;
  return {
    kind: rating ? "rating" : "result",
    locale,
    ageBand: input.ageBand,
    careLevel: input.careLevel,
    place: input.place,
    residentTax: input.residentTax,
    ratioStatus: result.decision.status,
    ratio: single ? result.decision.ratios[0] : null,
    servicePath: servicePathOf(input),
    rating,
  };
}

export function usageFingerprint(record: UsageRecord): string {
  return [
    record.locale,
    record.ageBand,
    record.careLevel,
    record.place,
    record.residentTax,
    record.ratioStatus,
    record.ratio ?? "",
    record.servicePath,
  ].join("|");
}

function pick<T extends string>(value: unknown, allowed: Set<T>): T | null {
  return typeof value === "string" && allowed.has(value as T) ? (value as T) : null;
}

/** Accepts only the category fields. Extra keys such as email or yen amounts are dropped. */
export function parseUsageBody(body: unknown): UsageRecord | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;
  const kind = pick(raw.kind, KINDS);
  const locale = pick(raw.locale, LOCALES);
  const ageBand = pick(raw.ageBand, AGES);
  const careLevel = pick(raw.careLevel, LEVELS);
  const place = pick(raw.place, PLACES);
  const residentTax = pick(raw.residentTax, TAXES);
  const ratioStatus = pick(raw.ratioStatus, STATUSES);
  const servicePath = pick(raw.servicePath, PATHS);
  if (!kind || !locale || !ageBand || !careLevel || !place || !residentTax || !ratioStatus || !servicePath) {
    return null;
  }

  let ratio: Ratio | null = null;
  if (raw.ratio != null) {
    if (!RATIOS.has(raw.ratio as Ratio)) return null;
    ratio = raw.ratio as Ratio;
  }
  if (ratioStatus !== "single") ratio = null;

  let rating = pick(raw.rating, RATINGS);
  if (kind === "result") rating = null;
  if (kind === "rating" && !rating) return null;

  return {
    kind,
    locale,
    ageBand,
    careLevel,
    place,
    residentTax,
    ratioStatus,
    ratio,
    servicePath,
    rating,
  };
}
