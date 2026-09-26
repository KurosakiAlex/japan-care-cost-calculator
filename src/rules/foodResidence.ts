import type { CertStage, RoomType, RuleMeta } from "./types";

export const DAYS_IN_ESTIMATE = 30;

/**
 * Daily yen transcribed from 介護保険最新情報 Vol.1506 attachment
 * 「補足給付の仕組み（令和8年8月〜）」, page 3 of the PDF.
 * Column order in the source: 第3段階②, 第3段階①, 第2段階, 第1段階, 基準費用額.
 */
export const FOOD = {
  standard: 1_545,
  limits: { "1": 300, "2": 390, "3-1": 680, "3-2": 1_420 },
  shortStayLimits: { "1": 300, "2": 600, "3-1": 1_030, "3-2": 1_360 },
} as const;

type StageLimits = Record<Exclude<CertStage, "unknown">, number>;

type ResidenceRow = {
  room: Exclude<RoomType, "unknown">;
  standard: number;
  limits: StageLimits;
};

export const RESIDENCE_ROWS: ResidenceRow[] = [
  { room: "multi", standard: 915, limits: { "1": 0, "2": 430, "3-1": 430, "3-2": 530 } },
  { room: "multi", standard: 697, limits: { "1": 0, "2": 430, "3-1": 430, "3-2": 530 } },
  { room: "multi", standard: 437, limits: { "1": 0, "2": 430, "3-1": 430, "3-2": 430 } },
  { room: "traditionalPrivate", standard: 1_231, limits: { "1": 380, "2": 480, "3-1": 880, "3-2": 980 } },
  { room: "traditionalPrivate", standard: 1_728, limits: { "1": 550, "2": 550, "3-1": 1_370, "3-2": 1_470 } },
  { room: "unitPrivate", standard: 2_066, limits: { "1": 880, "2": 880, "3-1": 1_370, "3-2": 1_470 } },
];

export const foodResidenceRule: RuleMeta = {
  id: "food-residence",
  title: "食費・居住費（特定入所者介護サービス費）",
  sourceTitle: "介護保険最新情報 Vol.1506（令和8年5月29日）および Vol.1513（令和8年6月22日）",
  sourceUrl: "https://www.wam.go.jp/gyoseiShiryou-files/documents/2026/0602085932175/ksvol.1506.pdf",
  effectiveFrom: "2026-08-01",
  checkedOn: "2026-09-26",
  official:
    "介護サービスの1〜3割に食費・居住費は含まれない。低所得で負担限度額認定を受けた人は、基準費用額と負担限度額の差が特定入所者介護サービス費として給付される。令和8年8月1日から食費の基準費用額は1日1,545円。第2段階と第3段階①の境は年金収入等82.65万円。預貯金の上限も認定要件。基準費用額を超える契約額は全額自己負担。",
  simplification:
    "認定段階が分かるときだけ、その段階の負担限度額×30日を使う。段階が不明なときは基準費用額の幅だけで、軽減後の額は計算しない。預貯金では段階を判定しない。施設種別を聞かないため、部屋の種類が同じでも特養と老健の居住費は幅になる。ショートステイの食費（【】内）は注記のみで計算に使わない。",
};

export type MoneySpan = { min: number; max: number };

function span(values: number[]): MoneySpan {
  return { min: Math.min(...values), max: Math.max(...values) };
}

export function foodRoomMonthly(roomType: RoomType, stage: CertStage | null): MoneySpan {
  const rows = roomType === "unknown" ? RESIDENCE_ROWS : RESIDENCE_ROWS.filter((row) => row.room === roomType);
  const useLimit = stage != null && stage !== "unknown";
  const daily = rows.map((row) => {
    const residence = useLimit ? row.limits[stage] : row.standard;
    const food = useLimit ? FOOD.limits[stage] : FOOD.standard;
    return (residence + food) * DAYS_IN_ESTIMATE;
  });
  return span(daily);
}

/** Reference range with no supplementary benefit, any room type. */
export function unreducedFoodRoomMonthly(): MoneySpan {
  return foodRoomMonthly("unknown", null);
}
