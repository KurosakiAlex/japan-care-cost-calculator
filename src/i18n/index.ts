import { en } from "./en";
import { ja } from "./ja";
import { zh } from "./zh";
import type { Locale, Messages } from "./types";

export const MESSAGES: Record<Locale, Messages> = { ja, en, zh };

export function formatRatio(template: string, ratio: number): string {
  return template.replace("{ratio}", String(ratio / 10));
}

export function formatRatioRange(template: string, from: number, to: number): string {
  return template.replace("{from}", String(from / 10)).replace("{to}", String(to / 10));
}
