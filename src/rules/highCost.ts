import type { RuleMeta } from "./types";

/** Monthly caps unchanged by Vol.1516. The 82.65万円 line changed on 2026-08-01. */
export const HIGH_COST_CAPS = {
  active3Household: 140_100,
  active2Household: 93_000,
  generalHousehold: 44_400,
  nontaxHousehold: 24_600,
  lowPersonal: 15_000,
} as const;

export const NONTAX_PENSION_LINE = 826_500;

export const highCostRule: RuleMeta = {
  id: "high-cost",
  title: "高額介護サービス費",
  sourceTitle:
    "介護保険最新情報 Vol.1516（令和8年6月25日、令和8年8月1日施行）。上限額自体は令和3年8月以降の金額",
  sourceUrl: "https://www.wam.go.jp/gyoseiShiryou-files/documents/2026/0626090952949/ksvol.1516.pdf",
  effectiveFrom: "2026-08-01",
  checkedOn: "2026-09-26",
  official:
    "保険給付の対象になる1〜3割の自己負担が、所得区分の月額上限を超えた分は申請により支給される。食費・居住費・日常生活費・福祉用具購入・住宅改修、および区分支給限度額を超えた10割負担は対象外。世帯全員が住民税非課税で年金等の合計が82.65万円以下の線は、令和8年8月1日から（それ以前の利用分は80.9万円）。上限額は生活保護等15,000円、非課税世帯24,600円（一定の人は個人15,000円）、課税世帯44,400円、現役並み93,000円または140,100円。",
  simplification:
    "課税所得380万円・690万円は年金収入から一意に決まらない。段階が特定できないときは上限を差し引かない。主表示はいったん支払う額。一般の課税世帯（上限44,400円）は、結果画面で利用者自身が選んだときだけ「申請後の目安」を別行で出す。",
};

export type HighCostBand = "unlikely" | "maybeNontax" | "maybeTaxable" | "unknown";

/** Classify the insured 1–3割 portion only. Never pass food or over-limit amounts. */
export function highCostBand(statutoryCopayYen: number | null): HighCostBand {
  if (statutoryCopayYen == null) return "unknown";
  if (statutoryCopayYen <= HIGH_COST_CAPS.lowPersonal) return "unlikely";
  if (statutoryCopayYen <= HIGH_COST_CAPS.generalHousehold) return "maybeNontax";
  return "maybeTaxable";
}

/** Refund if the household is the ordinary taxable band (44,400). Food and over-limit stay. */
export function refundIfGeneralTaxable(statutoryCopayYen: number): number {
  return Math.max(0, statutoryCopayYen - HIGH_COST_CAPS.generalHousehold);
}
