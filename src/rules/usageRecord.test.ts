import { describe, expect, it } from "vitest";
import { estimate } from "./estimate";
import type { EstimateInput } from "./types";
import { buildUsageRecord, parseUsageBody } from "./usageRecord";

function input(overrides: Partial<EstimateInput>): EstimateInput {
  return {
    ageBand: "65plus",
    careLevel: "care1",
    place: "home",
    residentTax: "unknown",
    pensionYen: null,
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

const cases: Array<{ name: string; input: EstimateInput; path: string; forbidden: string[] }> = [
  {
    name: "paid 80000",
    input: input({
      careLevel: "care1",
      residentTax: "unknown",
      pensionYen: 1_800_000,
      serviceFeeYen: 80_000,
      serviceAmountKind: "paid",
    }),
    path: "paid",
    forbidden: ["1800000", "80000", "80,000"],
  },
  {
    name: "preset typical",
    input: input({
      careLevel: "care3",
      residentTax: "taxable",
      pensionYen: 3_000_000,
      usagePreset: "typical",
    }),
    path: "preset",
    forbidden: ["3000000", "32458"],
  },
  {
    name: "couple gross 120000",
    input: input({
      careLevel: "care2",
      residentTax: "taxable",
      pensionYen: 2_000_000,
      household65: "withOthers",
      othersPensionYen: 2_000_000,
      serviceFeeYen: 120_000,
      serviceAmountKind: "gross",
    }),
    path: "gross",
    forbidden: ["2000000", "120000", "12000"],
  },
  {
    name: "facility skip",
    input: input({
      careLevel: "care4",
      place: "facility",
      residentTax: "exempt",
      pensionYen: 900_000,
      certStatus: "none",
    }),
    path: "skip",
    forbidden: ["900000", "59460", "108330"],
  },
  {
    name: "gross 400000",
    input: input({
      careLevel: "care5",
      residentTax: "taxable",
      pensionYen: 3_400_000,
      serviceFeeYen: 400_000,
      serviceAmountKind: "gross",
    }),
    path: "gross",
    forbidden: ["3400000", "400000", "120000"],
  },
];

describe("usage records", () => {
  it("keeps categories and drops yen amounts for five cases", () => {
    for (const item of cases) {
      const result = estimate(item.input);
      const record = buildUsageRecord(item.input, result, "ja", null);
      const text = JSON.stringify(record);
      expect(record.servicePath, item.name).toBe(item.path);
      expect(record.kind).toBe("result");
      expect(record.rating).toBeNull();
      expect(text.includes("pension") || text.includes("email") || text.includes("comment")).toBe(false);
      for (const secret of item.forbidden) {
        expect(text.includes(secret), `${item.name} leaked ${secret}: ${text}`).toBe(false);
      }
    }
  });

  it("records a rating click without copying amounts from the same result", () => {
    const item = cases[0];
    const result = estimate(item.input);
    const record = buildUsageRecord(item.input, result, "zh", "helpful");
    expect(record.kind).toBe("rating");
    expect(record.rating).toBe("helpful");
    expect(record.locale).toBe("zh");
    expect(JSON.stringify(record).includes("80000")).toBe(false);
  });

  it("drops email, comments, and yen when parsing a posted body", () => {
    const parsed = parseUsageBody({
      kind: "result",
      locale: "ja",
      ageBand: "65plus",
      careLevel: "care1",
      place: "home",
      residentTax: "unknown",
      ratioStatus: "single",
      ratio: 10,
      servicePath: "paid",
      rating: "helpful",
      email: "person@example.com",
      comment: "please call me",
      pensionYen: 1_800_000,
      serviceFeeYen: 80_000,
    });
    expect(parsed).toEqual({
      kind: "result",
      locale: "ja",
      ageBand: "65plus",
      careLevel: "care1",
      place: "home",
      residentTax: "unknown",
      ratioStatus: "single",
      ratio: 10,
      servicePath: "paid",
      rating: null,
    });
    expect(JSON.stringify(parsed).includes("example.com")).toBe(false);
  });
});
