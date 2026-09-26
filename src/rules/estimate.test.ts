import { describe, expect, it } from "vitest";
import { decideCopayRatio } from "./copayRatio";
import { estimate } from "./estimate";
import { FOOD, foodRoomMonthly } from "./foodResidence";
import { HIGH_COST_CAPS } from "./highCost";
import type { EstimateInput } from "./types";

function input(overrides: Partial<EstimateInput> = {}): EstimateInput {
  return {
    ageBand: "65plus",
    careLevel: "care1",
    place: "home",
    residentTax: "taxable",
    pensionYen: 2_000_000,
    otherIncome: "none",
    otherIncomeYen: null,
    household65: "alone",
    othersPensionYen: null,
    serviceFeeYen: 100_000,
    serviceAmountKind: "gross",
    usagePreset: null,
    foodRoomContractYen: null,
    roomType: "unknown",
    certStatus: "unknown",
    certStage: "unknown",
    assumeGeneralTaxableHousehold: false,
    ...overrides,
  };
}

describe("copay ratio", () => {
  it("maps pension-only single thresholds to 1, 2, and 3割", () => {
    expect(decideCopayRatio(input({ pensionYen: 2_790_000 })).ratios).toEqual([10]);
    expect(decideCopayRatio(input({ pensionYen: 2_800_000 })).ratios).toEqual([20]);
    expect(decideCopayRatio(input({ pensionYen: 3_390_000 })).ratios).toEqual([20]);
    expect(decideCopayRatio(input({ pensionYen: 3_400_000 })).ratios).toEqual([30]);
  });

  it("keeps a couple at 1割 when each person's income is under 160万", () => {
    const decision = decideCopayRatio(
      input({
        pensionYen: 2_000_000,
        household65: "withOthers",
        othersPensionYen: 2_000_000,
      }),
    );
    expect(decision.status).toBe("single");
    expect(decision.ratios).toEqual([10]);
  });

  it("forces 1割 for tax-exempt people and for ages 40-64", () => {
    expect(
      decideCopayRatio(input({ residentTax: "exempt", pensionYen: 5_000_000 })).ratios,
    ).toEqual([10]);
    expect(
      decideCopayRatio(input({ ageBand: "40-64", pensionYen: 5_000_000 })).ratios,
    ).toEqual([10]);
  });

  it("does not return a single ratio when other income is unknown", () => {
    const decision = decideCopayRatio(input({ otherIncome: "unknown", pensionYen: 2_000_000 }));
    expect(decision.status).toBe("undetermined");
    expect(decision.ratios).toEqual([]);
  });

  it("keeps low pension with no other income at 1割", () => {
    const decision = decideCopayRatio(
      input({
        residentTax: "unknown",
        pensionYen: 1_800_000,
        otherIncome: "none",
        household65: "alone",
      }),
    );
    expect(decision.status).toBe("single");
    expect(decision.ratios).toEqual([10]);
    expect(decision.reason).toBe("incomeUnder160");
  });
});

describe("monthly estimate", () => {
  it("does not create an over-limit amount from a yen gross figure", () => {
    const result = estimate(
      input({
        careLevel: "care1",
        serviceFeeYen: 200_000,
        serviceAmountKind: "gross",
        pensionYen: 2_000_000,
      }),
    );
    const row = result.byRatio[0];
    expect(row.ratio).toBe(10);
    expect(row.serviceCopay).toBe(20_000);
    expect(row.overLimit).toBe(0);
    expect(result.overLimitYen).toBe(0);
    expect(result.limitUnchecked).toBe(true);
    expect(result.assumptionIds).toContain("grossYenNoLimitCheck");
    expect(row.upfrontMin).toBe(20_000);
  });

  it("does not multiply a paid amount of 8,000 yen by the ratio", () => {
    const result = estimate(
      input({
        serviceFeeYen: 8_000,
        serviceAmountKind: "paid",
        pensionYen: 2_000_000,
      }),
    );
    const row = result.byRatio[0];
    expect(row.ratio).toBe(10);
    expect(row.serviceCopay).toBe(8_000);
    expect(row.overLimit).toBe(0);
    expect(row.upfrontMin).toBe(8_000);
    expect(result.assumptionIds).toContain("paidAmountAsIs");
  });

  it("keeps a home preset marked as an assumption and within the limit", () => {
    const result = estimate(
      input({
        careLevel: "care3",
        serviceFeeYen: null,
        serviceAmountKind: null,
        usagePreset: "typical",
        pensionYen: 3_000_000,
        residentTax: "taxable",
      }),
    );
    expect(result.serviceBaseIsAssumption).toBe(true);
    expect(result.assumptionIds).toContain("presetShare");
    expect(result.overLimitYen).toBe(0);
    expect(result.byRatio[0].overLimit).toBe(0);
    expect(result.serviceBaseYen).toBeLessThanOrEqual(result.limitYen ?? Number.POSITIVE_INFINITY);
  });

  it("interprets 80,000 as paid without remultiplying, and as gross with the ratio", () => {
    const paid = estimate(
      input({
        careLevel: "care1",
        residentTax: "unknown",
        pensionYen: 1_800_000,
        serviceFeeYen: 80_000,
        serviceAmountKind: "paid",
      }),
    );
    expect(paid.byRatio[0].serviceCopay).toBe(80_000);
    expect(paid.byRatio[0].upfrontMin).toBe(80_000);

    const gross = estimate(
      input({
        careLevel: "care1",
        residentTax: "unknown",
        pensionYen: 1_800_000,
        serviceFeeYen: 80_000,
        serviceAmountKind: "gross",
      }),
    );
    expect(gross.decision.ratios).toEqual([10]);
    expect(gross.byRatio[0].serviceCopay).toBe(8_000);
    expect(gross.byRatio[0].overLimit).toBe(0);
  });

  it("keeps food and residence outside the high-cost reduction", () => {
    const result = estimate(
      input({
        place: "facility",
        serviceFeeYen: 100_000,
        serviceAmountKind: "gross",
        foodRoomContractYen: 80_000,
        pensionYen: 2_000_000,
      }),
    );
    const row = result.byRatio[0];
    expect(row.serviceCopay).toBe(10_000);
    expect(row.foodMin).toBe(80_000);
    expect(row.upfrontMin).toBe(90_000);
    expect(result.highCostBand).toBe("unlikely");
    expect(result.refundIfGeneralTaxable).toBeNull();
  });

  it("returns the food span when facility service fee is unknown", () => {
    const result = estimate(
      input({
        careLevel: "care4",
        place: "facility",
        residentTax: "exempt",
        pensionYen: 900_000,
        serviceFeeYen: null,
        serviceAmountKind: null,
        foodRoomContractYen: null,
        roomType: "unknown",
        certStatus: "none",
      }),
    );
    expect(result.serviceUnknown).toBe(true);
    expect(result.food.kind).toBe("amount");
    if (result.food.kind === "amount") {
      expect(result.food.min).toBe((437 + 1_545) * 30);
      expect(result.food.max).toBe((2_066 + 1_545) * 30);
    }
    expect(result.byRatio[0].upfrontMin).toBe((437 + 1_545) * 30);
    expect(result.byRatio[0].upfrontMax).toBe((2_066 + 1_545) * 30);
  });

  it("does not subtract high-cost care from a large gross yen headline", () => {
    const result = estimate(
      input({
        careLevel: "care5",
        residentTax: "taxable",
        pensionYen: 3_400_000,
        serviceFeeYen: 400_000,
        serviceAmountKind: "gross",
      }),
    );
    expect(result.decision.ratios).toEqual([30]);
    expect(result.byRatio[0].serviceCopay).toBe(120_000);
    expect(result.byRatio[0].overLimit).toBe(0);
    expect(result.overLimitYen).toBe(0);
    expect(result.limitUnchecked).toBe(true);
    expect(result.byRatio[0].upfrontMin).toBe(120_000);
    expect(result.byRatio[0].upfrontMin).toBeGreaterThan(HIGH_COST_CAPS.generalHousehold);
    expect(result.refundIfGeneralTaxable).toBeNull();
    expect(result.highCostBand).toBe("maybeTaxable");
  });

  it("uses the August 2026 standard food amount and a room-type range", () => {
    expect(FOOD.standard).toBe(1_545);
    const unknown = foodRoomMonthly("unknown", null);
    expect(unknown.min).toBe((437 + 1_545) * 30);
    expect(unknown.max).toBe((2_066 + 1_545) * 30);
    const stage1Unit = foodRoomMonthly("unitPrivate", "1");
    expect(stage1Unit.min).toBe((880 + 300) * 30);
    expect(stage1Unit.max).toBe(stage1Unit.min);
  });
});
