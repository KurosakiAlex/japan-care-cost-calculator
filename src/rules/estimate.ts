import { benefitLimitYen, presetBaseYen, PRESET_SHARE } from "./benefitLimit";
import { decideCopayRatio } from "./copayRatio";
import { foodRoomMonthly, unreducedFoodRoomMonthly } from "./foodResidence";
import { highCostBand, refundIfGeneralTaxable, type HighCostBand } from "./highCost";
import type {
  AssumptionId,
  CopayDecision,
  EstimateInput,
  Ratio,
  ServiceAmountKind,
  UsagePreset,
} from "./types";

export type ChecklistId =
  | "certificate"
  | "careManager"
  | "benefitLimit"
  | "highCost"
  | "specificDisease"
  | "facilityQuote";

export type RatioMoney = {
  ratio: Ratio;
  serviceCopay: number | null;
  overLimit: number;
  foodMin: number | null;
  foodMax: number | null;
  foodExcluded: boolean;
  upfrontMin: number | null;
  upfrontMax: number | null;
};

export type FoodLine =
  | { kind: "excluded" }
  | { kind: "amount"; min: number; max: number };

export type EstimateResult = {
  decision: CopayDecision;
  food: FoodLine;
  serviceBaseYen: number | null;
  serviceAmountKind: ServiceAmountKind | null;
  serviceBaseIsAssumption: boolean;
  limitYen: number | null;
  overLimitYen: number;
  limitUnchecked: boolean;
  serviceUnknown: boolean;
  byRatio: RatioMoney[];
  highCostBand: HighCostBand;
  statutoryMin: number | null;
  statutoryMax: number | null;
  refundIfGeneralTaxable: Array<{
    ratio: Ratio;
    refund: number;
    afterMin: number;
    afterMax: number;
  }> | null;
  presetComparison: Array<{
    id: UsagePreset;
    baseYen: number;
    share: number;
    copay: Record<Ratio, number>;
  }> | null;
  ratioComparison: Array<{ ratio: Ratio; servicePlusOver: number }> | null;
  facilityFoodReference: { min: number; max: number } | null;
  checklist: ChecklistId[];
  assumptionIds: AssumptionId[];
};

const ALL_RATIOS: Ratio[] = [10, 20, 30];

function splitAgainstLimit(
  baseYen: number,
  limitYen: number | null,
  ratio: Ratio,
): { copay: number; over: number } {
  const rate = ratio / 100;
  if (limitYen == null) return { copay: Math.round(baseYen * rate), over: 0 };
  const covered = Math.min(baseYen, limitYen);
  const over = Math.max(0, baseYen - limitYen);
  return { copay: Math.round(covered * rate), over };
}

function foodFor(input: EstimateInput): { min: number; max: number } | "excluded" | null {
  if (input.place === "home") return "excluded";
  if (input.place === "undecided") return "excluded";
  if (input.foodRoomContractYen != null) {
    return { min: input.foodRoomContractYen, max: input.foodRoomContractYen };
  }
  const stage = input.certStatus === "has" && input.certStage !== "unknown" ? input.certStage : null;
  return foodRoomMonthly(input.roomType, stage);
}

function resolveServiceMoney(
  input: EstimateInput,
  isFacility: boolean,
): {
  serviceBaseYen: number | null;
  serviceAmountKind: ServiceAmountKind | null;
  serviceBaseIsAssumption: boolean;
  limitUnchecked: boolean;
  assumptions: AssumptionId[];
} {
  const assumptions: AssumptionId[] = [];
  let serviceBaseYen: number | null = null;
  let serviceAmountKind: ServiceAmountKind | null = null;
  let serviceBaseIsAssumption = false;
  let limitUnchecked = false;

  if (input.serviceFeeYen != null && input.serviceAmountKind === "paid") {
    serviceBaseYen = input.serviceFeeYen;
    serviceAmountKind = "paid";
    assumptions.push("paidAmountAsIs");
  } else if (input.serviceFeeYen != null && input.serviceAmountKind === "gross") {
    serviceBaseYen = input.serviceFeeYen;
    serviceAmountKind = "gross";
    if (!isFacility) {
      limitUnchecked = true;
      assumptions.push("grossYenNoLimitCheck");
    }
  } else if (!isFacility && input.usagePreset) {
    serviceBaseYen = presetBaseYen(input.careLevel, input.usagePreset);
    if (serviceBaseYen != null) {
      serviceBaseIsAssumption = true;
      assumptions.push("presetShare");
      assumptions.push("unitPrice10");
    }
  }

  if (!isFacility && serviceBaseYen != null && serviceAmountKind !== "paid" && input.careLevel === "unknown") {
    limitUnchecked = true;
    assumptions.push("limitUnchecked");
  }

  return {
    serviceBaseYen,
    serviceAmountKind,
    serviceBaseIsAssumption,
    limitUnchecked,
    assumptions,
  };
}

function moneyForRatio(
  serviceBaseYen: number | null,
  serviceAmountKind: ServiceAmountKind | null,
  limitYen: number | null,
  limitUnchecked: boolean,
  isPreset: boolean,
  ratio: Ratio,
): { copay: number | null; over: number } {
  if (serviceBaseYen == null) return { copay: null, over: 0 };
  if (serviceAmountKind === "paid") {
    return { copay: serviceBaseYen, over: 0 };
  }
  if (serviceAmountKind === "gross" || limitUnchecked) {
    return { copay: Math.round(serviceBaseYen * (ratio / 100)), over: 0 };
  }
  // Preset (or any path that still uses the unit-limit conversion)
  const effectiveLimit = isPreset || limitYen != null ? limitYen : null;
  return splitAgainstLimit(serviceBaseYen, effectiveLimit, ratio);
}

export function estimate(input: EstimateInput): EstimateResult {
  const decision = decideCopayRatio(input);
  const assumptions = new Set<AssumptionId>(["notOfficialDetermination"]);
  if (decision.usedPensionConversion) assumptions.add("pensionDeduction");
  if (input.otherIncome === "known") assumptions.add("otherIncomeAsTotalIncome");
  if (input.household65 === "withOthers" && input.othersPensionYen != null) {
    assumptions.add("othersNonPensionIgnored");
  }

  const isFacility = input.place === "facility";
  const limitYen = !isFacility ? benefitLimitYen(input.careLevel) : null;
  const resolved = resolveServiceMoney(input, isFacility);
  for (const id of resolved.assumptions) assumptions.add(id);

  const {
    serviceBaseYen,
    serviceAmountKind,
    serviceBaseIsAssumption,
    limitUnchecked,
  } = resolved;
  const isPreset = !isFacility && input.usagePreset != null && serviceAmountKind == null;

  const food = foodFor(input);
  if (isFacility) {
    assumptions.add("days30");
    if (input.foodRoomContractYen == null) {
      assumptions.add("facilityTypeRange");
      assumptions.add("shortStayNotApplied");
    }
  }

  const ratiosForMoney: Ratio[] =
    decision.status === "undetermined" ? [] : decision.ratios;

  const byRatio: RatioMoney[] = ratiosForMoney.map((ratio) => {
    const split = moneyForRatio(
      serviceBaseYen,
      serviceAmountKind,
      limitYen,
      limitUnchecked,
      isPreset,
      ratio,
    );
    const foodExcluded = food === "excluded";
    const foodMin = food && food !== "excluded" ? food.min : null;
    const foodMax = food && food !== "excluded" ? food.max : null;
    const serviceUnknown = split.copay == null;
    let upfrontMin: number | null = null;
    let upfrontMax: number | null = null;
    if (!serviceUnknown && foodExcluded) {
      upfrontMin = (split.copay ?? 0) + split.over;
      upfrontMax = upfrontMin;
    } else if (!serviceUnknown && foodMin != null && foodMax != null) {
      upfrontMin = (split.copay ?? 0) + split.over + foodMin;
      upfrontMax = (split.copay ?? 0) + split.over + foodMax;
    } else if (serviceUnknown && foodMin != null && foodMax != null) {
      // Facility (or similar) with no service fee: food/residence span is the headline.
      upfrontMin = foodMin;
      upfrontMax = foodMax;
    }
    return {
      ratio,
      serviceCopay: split.copay,
      overLimit: split.over,
      foodMin,
      foodMax,
      foodExcluded,
      upfrontMin,
      upfrontMax,
    };
  });

  // When ratio is undetermined but food exists (facility skip), still surface food as upfront via a synthetic row.
  if (byRatio.length === 0 && food && food !== "excluded") {
    byRatio.push({
      ratio: 10,
      serviceCopay: null,
      overLimit: 0,
      foodMin: food.min,
      foodMax: food.max,
      foodExcluded: false,
      upfrontMin: food.min,
      upfrontMax: food.max,
    });
  }

  const statutoryValues = byRatio
    .map((row) => row.serviceCopay)
    .filter((value): value is number => value != null);
  const statutoryMin = statutoryValues.length ? Math.min(...statutoryValues) : null;
  const statutoryMax = statutoryValues.length ? Math.max(...statutoryValues) : null;
  const band = highCostBand(statutoryMax);

  let refund: EstimateResult["refundIfGeneralTaxable"] = null;
  if (input.assumeGeneralTaxableHousehold && decision.status === "single" && statutoryMax != null) {
    refund = byRatio
      .filter((row) => row.serviceCopay != null && row.upfrontMin != null && row.upfrontMax != null)
      .map((row) => {
        const back = refundIfGeneralTaxable(row.serviceCopay ?? 0);
        return {
          ratio: row.ratio,
          refund: back,
          afterMin: (row.upfrontMin ?? 0) - back,
          afterMax: (row.upfrontMax ?? 0) - back,
        };
      });
  }

  const ratioComparison =
    serviceBaseYen == null || serviceAmountKind === "paid"
      ? null
      : ALL_RATIOS.map((ratio) => {
          const split = moneyForRatio(
            serviceBaseYen,
            serviceAmountKind,
            limitYen,
            limitUnchecked,
            isPreset,
            ratio,
          );
          return { ratio, servicePlusOver: (split.copay ?? 0) + split.over };
        });

  let presetComparison: EstimateResult["presetComparison"] = null;
  if (!isFacility && input.careLevel !== "unknown") {
    const presets: UsagePreset[] = ["light", "typical", "nearLimit"];
    presetComparison = presets.map((id) => {
      const baseYen = presetBaseYen(input.careLevel, id) ?? 0;
      const copay = {
        10: splitAgainstLimit(baseYen, benefitLimitYen(input.careLevel), 10).copay,
        20: splitAgainstLimit(baseYen, benefitLimitYen(input.careLevel), 20).copay,
        30: splitAgainstLimit(baseYen, benefitLimitYen(input.careLevel), 30).copay,
      };
      return { id, baseYen, share: PRESET_SHARE[id], copay };
    });
    assumptions.add("unitPrice10");
  }

  const facilityFoodReference =
    input.place === "home" || input.place === "undecided" ? unreducedFoodRoomMonthly() : null;

  const checklist: ChecklistId[] = ["certificate", "careManager"];
  if (input.ageBand === "40-64") checklist.push("specificDisease");
  if (input.place === "facility" && serviceBaseYen == null) checklist.push("facilityQuote");
  if (input.place === "facility" || input.place === "undecided") checklist.push("benefitLimit");
  if (band === "maybeNontax" || band === "maybeTaxable") checklist.push("highCost");

  const primary = byRatio.find((row) => row.serviceCopay != null) ?? byRatio[0];
  const foodLine: FoodLine =
    food === "excluded" || food == null
      ? { kind: "excluded" }
      : { kind: "amount", min: food.min, max: food.max };
  return {
    decision,
    food: foodLine,
    serviceBaseYen,
    serviceAmountKind,
    serviceBaseIsAssumption,
    limitYen: limitUnchecked || serviceAmountKind === "gross" ? null : limitYen,
    overLimitYen: primary?.overLimit ?? 0,
    limitUnchecked: limitUnchecked || serviceAmountKind === "gross",
    serviceUnknown: serviceBaseYen == null,
    byRatio,
    highCostBand: band,
    statutoryMin,
    statutoryMax,
    refundIfGeneralTaxable: refund,
    presetComparison,
    ratioComparison,
    facilityFoodReference,
    checklist,
    assumptionIds: [...assumptions],
  };
}
