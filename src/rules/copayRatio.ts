import type { CopayDecision, EstimateInput, Ratio, RuleMeta } from "./types";

/**
 * Official gates from 介護保険最新情報 Vol.1238 (令和6年3月29日).
 * 2割拡大 was still deferred as of the 2026-09-26 check.
 */
export const TOTAL_INCOME_10_MAX = 1_600_000;
export const TOTAL_INCOME_30_MIN = 2_200_000;
export const SINGLE_PENSION_20 = 2_800_000;
export const SINGLE_PENSION_30 = 3_400_000;
export const MULTI_PENSION_20 = 3_460_000;
export const MULTI_PENSION_30 = 4_630_000;

/**
 * 国税庁「高齢者と税」公的年金等控除（公的年金等以外の所得が1,000万円以下）。
 * Confirmed 2026-09-26: 65歳以上・330万円未満は収入−110万円。
 * 270万円 is NOT exported and must not be shown as a statutory line.
 */
export const PENSION_DEDUCTION_UNDER_330 = 1_100_000;

export const copayRatioRule: RuleMeta = {
  id: "copay-ratio",
  title: "介護保険の利用者負担割合",
  sourceTitle: "介護保険最新情報 Vol.1238（令和6年3月29日）",
  sourceUrl: "https://www.mhlw.go.jp/content/001240323.pdf",
  effectiveFrom: "2018-08-01",
  checkedOn: "2026-09-26",
  official:
    "65歳以上は、本人の合計所得金額（160万円・220万円）と、同一世帯の第1号被保険者全員の「公的年金等の収入金額＋その他の合計所得金額」（単身280万円・340万円、2人以上346万円・463万円）で1割・2割・3割を判定する。本人が住民税非課税、または生活保護の場合は所得にかかわらず1割。40〜64歳の第2号被保険者は1割。判定は毎年8月1日、有効期限は翌年7月31日。",
  simplification:
    "合計所得金額は税情報がないため、年金以外の所得がないときだけ国税庁の公的年金等控除で見積もる。この換算額は法定ラインではない。年金以外の所得が不明、他の65歳以上の年金が不明、年齢が不明で結果が分かれる場合は、単一の割合を出さない。土地譲渡の特別控除、所得更正、月途中の65歳到達は計算しない。",
};

/** Miscellaneous income from public pension for a person aged 65+. */
export function pensionMiscellaneousIncome(pensionYen: number, otherIncomeYen: number): number {
  let income: number;
  if (pensionYen <= PENSION_DEDUCTION_UNDER_330) income = 0;
  else if (pensionYen < 3_300_000) income = pensionYen - PENSION_DEDUCTION_UNDER_330;
  else if (pensionYen < 4_100_000) income = pensionYen * 0.75 - 275_000;
  else if (pensionYen < 7_700_000) income = pensionYen * 0.85 - 685_000;
  else if (pensionYen < 10_000_000) income = pensionYen * 0.95 - 1_455_000;
  else income = pensionYen - 1_955_000;

  if (otherIncomeYen > 20_000_000) income += 200_000;
  else if (otherIncomeYen > 10_000_000) income += 100_000;

  return Math.max(0, Math.round(income));
}

export function officialRatio(totalIncomeYen: number, householdTestIncomeYen: number, multiple: boolean): Ratio {
  if (totalIncomeYen < TOTAL_INCOME_10_MAX) return 10;
  const low = multiple ? MULTI_PENSION_20 : SINGLE_PENSION_20;
  const high = multiple ? MULTI_PENSION_30 : SINGLE_PENSION_30;
  if (totalIncomeYen < TOTAL_INCOME_30_MIN) {
    return householdTestIncomeYen < low ? 10 : 20;
  }
  if (householdTestIncomeYen < low) return 10;
  if (householdTestIncomeYen < high) return 20;
  return 30;
}

/**
 * True when pension-only conversion already forces 1割 (no other income).
 * Household and other-income answers then do not change the ratio.
 * Do not display the underlying yen conversion as a statutory line.
 */
export function pensionAloneKeeps10(pensionYen: number | null): boolean {
  if (pensionYen == null) return false;
  return pensionMiscellaneousIncome(pensionYen, 0) < TOTAL_INCOME_10_MAX;
}

function uniqueSorted(ratios: Ratio[]): Ratio[] {
  return [...new Set(ratios)].sort((a, b) => a - b) as Ratio[];
}

export function decideCopayRatio(input: EstimateInput): CopayDecision {
  if (input.ageBand === "40-64") {
    return {
      status: "single",
      ratios: [10],
      reason: "secondInsured",
      usedPensionConversion: false,
      estimatedTotalIncomeYen: null,
      householdTestIncomeYen: null,
    };
  }

  if (input.residentTax === "exempt") {
    return {
      status: "single",
      ratios: [10],
      reason: "taxExempt",
      usedPensionConversion: false,
      estimatedTotalIncomeYen: null,
      householdTestIncomeYen: null,
    };
  }

  if (input.otherIncome === "unknown") {
    return {
      status: "undetermined",
      ratios: [],
      reason: "undeterminedOtherIncome",
      usedPensionConversion: false,
      estimatedTotalIncomeYen: null,
      householdTestIncomeYen: null,
    };
  }

  if (input.pensionYen == null) {
    return {
      status: "undetermined",
      ratios: [],
      reason: "undeterminedPension",
      usedPensionConversion: false,
      estimatedTotalIncomeYen: null,
      householdTestIncomeYen: null,
    };
  }

  const otherYen = input.otherIncome === "known" ? (input.otherIncomeYen ?? 0) : 0;
  const estimatedTotalIncomeYen = pensionMiscellaneousIncome(input.pensionYen, otherYen) + otherYen;
  const base: Omit<CopayDecision, "status" | "ratios" | "reason"> = {
    usedPensionConversion: true,
    estimatedTotalIncomeYen,
    householdTestIncomeYen: null,
  };

  if (estimatedTotalIncomeYen < TOTAL_INCOME_10_MAX) {
    const decision: CopayDecision = {
      ...base,
      status: "single",
      ratios: [10],
      reason: "incomeUnder160",
    };
    return input.ageBand === "unknown" ? widenForUnknownAge(decision) : decision;
  }

  if (input.household65 === "unknown") {
    const ratios: Ratio[] =
      estimatedTotalIncomeYen < TOTAL_INCOME_30_MIN ? [10, 20] : [10, 20, 30];
    const decision: CopayDecision = {
      ...base,
      status: "range",
      ratios,
      reason: "rangeHouseholdUnknown",
    };
    return input.ageBand === "unknown" ? widenForUnknownAge(decision) : decision;
  }

  if (input.household65 === "withOthers" && input.othersPensionYen == null) {
    return {
      ...base,
      status: "undetermined",
      ratios: [],
      reason: "undeterminedHousehold",
    };
  }

  const multiple = input.household65 === "withOthers";
  const householdTestIncomeYen = input.pensionYen + otherYen + (multiple ? (input.othersPensionYen ?? 0) : 0);
  const ratio = officialRatio(estimatedTotalIncomeYen, householdTestIncomeYen, multiple);
  let decision: CopayDecision = {
    ...base,
    householdTestIncomeYen,
    status: "single",
    ratios: [ratio],
    reason: ratio === 30 ? "ratio30" : ratio === 20 ? "ratio20" : "householdKeeps10",
  };

  if (input.residentTax === "unknown" && ratio !== 10) {
    decision = {
      ...decision,
      status: "range",
      ratios: uniqueSorted([10, ratio]),
      reason: "rangeTaxUnknown",
    };
  }

  if (input.ageBand === "unknown") decision = widenForUnknownAge(decision);
  return decision;
}

function widenForUnknownAge(decision: CopayDecision): CopayDecision {
  if (decision.status === "undetermined") {
    return { ...decision, reason: "undeterminedAge" };
  }
  const ratios = uniqueSorted([10, ...decision.ratios]);
  if (ratios.length === 1) return decision;
  return {
    ...decision,
    status: "range",
    ratios,
    reason: "rangeAgeUnknown",
  };
}
