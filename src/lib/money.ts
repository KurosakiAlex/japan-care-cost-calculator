export function formatYen(value: number): string {
  return new Intl.NumberFormat("ja-JP").format(value);
}

export function formatYenSpan(min: number, max: number, join: string): string {
  if (min === max) return formatYen(min);
  return `${formatYen(min)}${join}${formatYen(max)}`;
}

export function manToYen(text: string): number | null {
  const trimmed = text.trim().replace(/,/g, "");
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 10_000);
}

export function parseYen(text: string): number | null {
  const trimmed = text.trim().replace(/,/g, "");
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}
