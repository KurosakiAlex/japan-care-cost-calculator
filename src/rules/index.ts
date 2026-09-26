import { benefitLimitRule } from "./benefitLimit";
import { copayRatioRule } from "./copayRatio";
import { foodResidenceRule } from "./foodResidence";
import { highCostRule } from "./highCost";
import type { RuleMeta } from "./types";

export const RULES: RuleMeta[] = [copayRatioRule, benefitLimitRule, highCostRule, foodResidenceRule];

export const RULES_CHECKED_ON = "2026-09-26";
