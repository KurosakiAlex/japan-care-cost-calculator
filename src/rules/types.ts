export type AgeBand = "40-64" | "65plus" | "unknown";
export type CareLevel =
  | "support1"
  | "support2"
  | "care1"
  | "care2"
  | "care3"
  | "care4"
  | "care5"
  | "unknown";
export type Place = "home" | "facility" | "undecided";
export type ResidentTax = "taxable" | "exempt" | "unknown";
export type OtherIncome = "none" | "known" | "unknown";
export type Household65 = "alone" | "withOthers" | "unknown";
export type UsagePreset = "light" | "typical" | "nearLimit";
export type RoomType = "multi" | "traditionalPrivate" | "unitPrivate" | "unknown";
export type CertStatus = "none" | "has" | "unknown";
export type CertStage = "1" | "2" | "3-1" | "3-2" | "unknown";
export type Ratio = 10 | 20 | 30;
/** How a known yen figure relates to the insured care service. */
export type ServiceAmountKind = "paid" | "gross";

export type EstimateInput = {
  ageBand: AgeBand;
  careLevel: CareLevel;
  place: Place;
  residentTax: ResidentTax;
  /** Annual public pension of the person, in yen. Null when unknown. */
  pensionYen: number | null;
  otherIncome: OtherIncome;
  /** Treated as その他の合計所得金額 only as a labeled simplification. */
  otherIncomeYen: number | null;
  household65: Household65;
  /** Annual pension total of other 65+ household members, in yen. */
  othersPensionYen: number | null;
  /**
   * Monthly yen figure for insured care, when the user knows one.
   * Meaning depends on serviceAmountKind: already paid, or 10割 before copay.
   */
  serviceFeeYen: number | null;
  /** paid = left the account; gross = insured total before copay. Null when skipped/preset. */
  serviceAmountKind: ServiceAmountKind | null;
  /** Home-care preset used only when the user does not know the fee. */
  usagePreset: UsagePreset | null;
  /** Facility food + residence contract amount, when known. */
  foodRoomContractYen: number | null;
  roomType: RoomType;
  certStatus: CertStatus;
  certStage: CertStage;
  /** User opted in on the result page. Default false. */
  assumeGeneralTaxableHousehold: boolean;
};

export type ReasonCode =
  | "secondInsured"
  | "taxExempt"
  | "incomeUnder160"
  | "householdKeeps10"
  | "ratio20"
  | "ratio30"
  | "rangeTaxUnknown"
  | "rangeAgeUnknown"
  | "rangeHouseholdUnknown"
  | "undeterminedOtherIncome"
  | "undeterminedPension"
  | "undeterminedHousehold"
  | "undeterminedAge";

export type AssumptionId =
  | "pensionDeduction"
  | "otherIncomeAsTotalIncome"
  | "othersNonPensionIgnored"
  | "unitPrice10"
  | "presetShare"
  | "days30"
  | "facilityTypeRange"
  | "shortStayNotApplied"
  | "limitUnchecked"
  | "grossYenNoLimitCheck"
  | "paidAmountAsIs"
  | "notOfficialDetermination";

export type CopayDecision = {
  status: "single" | "range" | "undetermined";
  ratios: Ratio[];
  reason: ReasonCode;
  usedPensionConversion: boolean;
  estimatedTotalIncomeYen: number | null;
  householdTestIncomeYen: number | null;
};

export type RuleMeta = {
  id: string;
  title: string;
  sourceTitle: string;
  sourceUrl: string;
  effectiveFrom: string;
  checkedOn: string;
  official: string;
  simplification: string;
};
