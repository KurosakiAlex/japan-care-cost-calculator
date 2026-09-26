import { describe, expect, it } from "vitest";
import { formatYenSpan } from "@/src/lib/money";
import { estimate } from "./estimate";
import type { EstimateInput } from "./types";

function input(overrides: Partial<EstimateInput>): EstimateInput {
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
    serviceFeeYen: null,
    serviceAmountKind: null,
    usagePreset: null,
    foodRoomContractYen: null,
    roomType: "unknown",
    certStatus: "unknown",
    certStage: "unknown",
    assumeGeneralTaxableHousehold: false,
    ...overrides,
  };
}

function headline(result: ReturnType<typeof estimate>): string {
  const ups = result.byRatio.filter((row) => row.upfrontMin != null && row.upfrontMax != null);
  if (!ups.length) return "(none)";
  return formatYenSpan(
    Math.min(...ups.map((row) => row.upfrontMin ?? 0)),
    Math.max(...ups.map((row) => row.upfrontMax ?? 0)),
    "〜",
  );
}

describe("five review scenarios headlines", () => {
  it("prints the five headlines used in review", () => {
    const s1paid = estimate(
      input({
        careLevel: "care1",
        residentTax: "unknown",
        pensionYen: 1_800_000,
        serviceFeeYen: 80_000,
        serviceAmountKind: "paid",
      }),
    );
    const s1gross = estimate(
      input({
        careLevel: "care1",
        residentTax: "unknown",
        pensionYen: 1_800_000,
        serviceFeeYen: 80_000,
        serviceAmountKind: "gross",
      }),
    );
    const s2 = estimate(
      input({
        careLevel: "care3",
        residentTax: "taxable",
        pensionYen: 3_000_000,
        usagePreset: "typical",
      }),
    );
    const s3 = estimate(
      input({
        careLevel: "care2",
        pensionYen: 2_000_000,
        household65: "withOthers",
        othersPensionYen: 2_000_000,
        serviceFeeYen: 120_000,
        serviceAmountKind: "gross",
      }),
    );
    const s4 = estimate(
      input({
        careLevel: "care4",
        place: "facility",
        residentTax: "exempt",
        pensionYen: 900_000,
        certStatus: "none",
      }),
    );
    const s5 = estimate(
      input({
        careLevel: "care5",
        residentTax: "taxable",
        pensionYen: 3_400_000,
        serviceFeeYen: 400_000,
        serviceAmountKind: "gross",
      }),
    );

    expect(headline(s1paid)).toBe("80,000");
    expect(headline(s1gross)).toBe("8,000");
    expect(headline(s2)).toBe("32,458");
    expect(headline(s3)).toBe("12,000");
    expect(headline(s4)).toBe("59,460〜108,330");
    expect(headline(s5)).toBe("120,000");
    expect(s5.overLimitYen).toBe(0);
    expect(s5.refundIfGeneralTaxable).toBeNull();
  });
});
