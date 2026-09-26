import type { CareLevel, RuleMeta, UsagePreset } from "./types";

/** Units in force since 2019-10-01. Reiwa 6 and Reiwa 8 fee revisions did not change them. */
export const BENEFIT_LIMIT_UNITS: Record<Exclude<CareLevel, "unknown">, number> = {
  support1: 5_032,
  support2: 10_531,
  care1: 16_765,
  care2: 19_705,
  care3: 27_048,
  care4: 30_938,
  care5: 36_217,
};

/** Product assumption. Regional unit prices are higher than 10 yen. */
export const YEN_PER_UNIT = 10;

export const PRESET_SHARE: Record<UsagePreset, number> = {
  light: 0.3,
  typical: 0.6,
  nearLimit: 1,
};

export const benefitLimitRule: RuleMeta = {
  id: "benefit-limit",
  title: "居宅サービスの区分支給限度基準額",
  sourceTitle: "区分支給限度基準額（平成27年厚生労働省告示第95号。単位数は2019年10月1日から現行）",
  sourceUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000188411_00073.html",
  effectiveFrom: "2019-10-01",
  checkedOn: "2026-09-26",
  official:
    "居宅サービスは要介護度ごとの区分支給限度基準額（単位）の範囲内が1〜3割、超えた分は10割自己負担。施設サービスはこの限度額の対象外。2024年4月と2026年6月の介護報酬改定では、この単位数の変更は公表されていない。",
  simplification:
    "円への換算は1単位＝10円。地域区分ではこれより高くなる。利用量が不明なときの「少なめ30%・ふつう60%・限度額付近100%」は公式の標準プランではない。",
};

export function benefitLimitYen(careLevel: CareLevel): number | null {
  if (careLevel === "unknown") return null;
  return BENEFIT_LIMIT_UNITS[careLevel] * YEN_PER_UNIT;
}

export function presetBaseYen(careLevel: CareLevel, preset: UsagePreset): number | null {
  const limit = benefitLimitYen(careLevel);
  if (limit == null) return null;
  return Math.round(limit * PRESET_SHARE[preset]);
}
