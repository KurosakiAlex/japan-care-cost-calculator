"use client";

import { useState } from "react";
import Link from "next/link";
import { formatRatio, formatRatioRange } from "@/src/i18n";
import { formatYen, formatYenSpan } from "@/src/lib/money";
import { PRESET_SHARE } from "@/src/rules/benefitLimit";
import type { EstimateResult } from "@/src/rules/estimate";
import type { EstimateInput, Ratio } from "@/src/rules/types";
import { FeedbackForm } from "./FeedbackForm";
import { useI18n } from "./Providers";

export function ResultView({
  input,
  result,
  onEdit,
  onAssumeTaxable,
}: {
  input: EstimateInput;
  result: EstimateResult;
  onEdit: () => void;
  onAssumeTaxable: (value: boolean) => void;
}) {
  const { t } = useI18n();
  const [openFacility, setOpenFacility] = useState(false);
  const [openRatioCompare, setOpenRatioCompare] = useState(false);
  const join = t.rangeJoin;
  const ratios = result.decision.ratios;
  const ratioLabel =
    result.decision.status === "undetermined" || ratios.length === 0
      ? t.ratioUndetermined
      : ratios.length === 1
        ? formatRatio(t.ratioValue, ratios[0])
        : formatRatioRange(t.ratioRange, ratios[0], ratios[ratios.length - 1]);

  const foodOnlyHeadline = result.serviceUnknown && result.food.kind === "amount";
  const upfronts = result.byRatio.filter((row) => row.upfrontMin != null && row.upfrontMax != null);
  const headline =
    upfronts.length > 0
      ? formatYenSpan(
          Math.min(...upfronts.map((row) => row.upfrontMin ?? 0)),
          Math.max(...upfronts.map((row) => row.upfrontMax ?? 0)),
          join,
        )
      : null;

  const serviceValues = result.byRatio
    .map((row) => row.serviceCopay)
    .filter((value): value is number => value != null);

  const singleRatio = result.decision.status === "single" && ratios.length === 1;
  const headlineReason = headlineReasonText(input, result, t, ratioLabel);
  const largestExcluded = foodOnlyHeadline
    ? t.largestExcludedFacilityService
    : input.place === "home" || input.place === "undecided"
      ? t.largestExcludedHome
      : result.serviceUnknown
        ? t.largestExcludedFacilityService
        : t.excludedItems;

  const highCostText =
    result.highCostBand === "unlikely"
      ? t.highCostUnlikely
      : result.highCostBand === "maybeNontax"
        ? input.residentTax === "taxable"
          ? t.highCostBetweenTaxable
          : t.highCostBetween
        : result.highCostBand === "maybeTaxable"
          ? t.highCostAbove
          : t.highCostUnknown;

  const showOverLine = input.place !== "facility";
  const overLineValue = result.limitUnchecked
    ? t.lineOverNotJudged
    : result.serviceUnknown
      ? t.notEstimated
      : result.serviceBaseIsAssumption
        ? `${formatYen(result.overLimitYen)} ${t.perMonth}`
        : result.overLimitYen > 0
          ? `${formatYen(result.overLimitYen)} ${t.perMonth}`
          : `${formatYen(0)} ${t.perMonth}`;

  return (
    <div>
      <p className="text-sm text-stone-600">{foodOnlyHeadline ? t.resultEyebrowFood : t.resultEyebrow}</p>
      {headline ? (
        <p className="mt-1 text-4xl font-semibold tracking-tight">
          {headline}
          <span className="ml-2 text-base font-normal text-stone-600">{t.perMonth}</span>
        </p>
      ) : (
        <p className="mt-2 text-lg font-semibold">
          {result.serviceUnknown ? t.serviceMissing : t.cannotDecideAmount}
        </p>
      )}
      <p className="mt-2 text-sm leading-6 text-stone-700">
        {foodOnlyHeadline ? t.payFirstFood : t.payFirst}
      </p>
      {headlineReason ? <p className="mt-2 text-sm leading-6">{headlineReason}</p> : null}
      {headline ? <p className="mt-2 text-sm leading-6 text-stone-700">{largestExcluded}</p> : null}
      {result.decision.status === "undetermined" && !result.serviceUnknown && !foodOnlyHeadline ? (
        <p className="mt-2 text-sm leading-6">{t.cannotDecideAmount}</p>
      ) : null}

      <dl className="mt-5 divide-y divide-stone-200 border-y border-stone-200">
        <Line
          label={t.lineService}
          value={
            serviceValues.length
              ? `${formatYenSpan(Math.min(...serviceValues), Math.max(...serviceValues), join)} ${t.perMonth}`
              : t.notEstimated
          }
        />
        {showOverLine ? <Line label={t.lineOver} value={overLineValue} /> : null}
        <Line
          label={t.lineFood}
          value={
            result.food.kind === "excluded"
              ? t.notIncluded
              : `${formatYenSpan(result.food.min, result.food.max, join)} ${t.perMonth}`
          }
        />
      </dl>

      <h2 className="mt-6 text-base font-semibold">{t.ratioLabel}</h2>
      <p className="mt-1 text-2xl font-semibold">{ratioLabel}</p>
      <h3 className="mt-4 text-sm font-semibold">{t.whyTitle}</h3>
      <p className="mt-1 text-sm leading-6">{t.reasons[result.decision.reason]}</p>
      <p className="mt-2 text-sm leading-6 text-stone-700">{t.changeNote}</p>

      <h2 className="mt-6 text-base font-semibold">{t.medicalTitle}</h2>
      <p className="mt-1 text-sm leading-6">{t.medicalBody}</p>

      <h2 className="mt-6 text-base font-semibold">{t.highCostTitle}</h2>
      <p className="mt-1 text-sm leading-6">{highCostText}</p>
      {result.food.kind === "amount" ? <p className="mt-2 text-sm leading-6">{t.highCostFoodOut}</p> : null}
      {result.decision.status === "single" && result.highCostBand === "maybeTaxable" ? (
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={input.assumeGeneralTaxableHousehold}
            onChange={(event) => onAssumeTaxable(event.target.checked)}
            className="mt-1"
          />
          <span>{t.assumeTaxable}</span>
        </label>
      ) : null}
      {result.refundIfGeneralTaxable?.map((row) => (
        <p key={row.ratio} className="mt-2 text-sm leading-6">
          {t.afterRefund}: {formatYenSpan(row.afterMin, row.afterMax, join)} {t.perMonth}
        </p>
      ))}

      <h2 className="mt-6 text-base font-semibold">{t.excludedTitle}</h2>
      <p className="mt-1 text-sm leading-6">{t.excludedItems}</p>

      {result.ratioComparison ? (
        <section className="mt-6">
          <h2 className="text-base font-semibold">{t.compareTitle}</h2>
          {singleRatio ? (
            <>
              <button
                type="button"
                className="mt-2 text-sm font-semibold text-teal-900"
                onClick={() => setOpenRatioCompare((open) => !open)}
              >
                {t.compareRatioFold}
              </button>
              {openRatioCompare ? (
                <>
                  <p className="mt-2 text-sm leading-6">{t.compareRatio}</p>
                  <ul className="mt-2 text-sm leading-6">
                    {result.ratioComparison.map((row) => (
                      <li key={row.ratio}>
                        {formatRatio(t.ratioValue, row.ratio as Ratio)}: {formatYen(row.servicePlusOver)}{" "}
                        {t.perMonth}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          ) : (
            <>
              <p className="mt-1 text-sm leading-6">{t.compareRatio}</p>
              <ul className="mt-2 text-sm leading-6">
                {result.ratioComparison.map((row) => (
                  <li key={row.ratio}>
                    {formatRatio(t.ratioValue, row.ratio as Ratio)}: {formatYen(row.servicePlusOver)} {t.perMonth}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ) : null}

      {result.presetComparison ? (
        <section className="mt-4">
          <p className="text-sm leading-6">{t.comparePreset}</p>
          <ul className="mt-2 text-sm leading-6">
            {result.presetComparison.map((row) => (
              <li key={row.id}>
                {row.id === "light" ? t.presetLight : row.id === "typical" ? t.presetTypical : t.presetNear}:{" "}
                {formatYen(row.baseYen)} {t.perMonth}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {result.facilityFoodReference ? (
        <section className="mt-4">
          <button type="button" className="text-sm font-semibold text-teal-900" onClick={() => setOpenFacility((open) => !open)}>
            {t.facilityFold}
          </button>
          {openFacility ? (
            <p className="mt-2 text-sm leading-6">
              {t.facilityFoldBody}{" "}
              {formatYenSpan(result.facilityFoodReference.min, result.facilityFoodReference.max, join)} {t.perMonth}
            </p>
          ) : null}
        </section>
      ) : null}

      <h2 className="mt-6 text-base font-semibold">{t.checklistTitle}</h2>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6">
        {result.checklist.map((id) => (
          <li key={id}>{t.checks[id]}</li>
        ))}
      </ul>

      <h2 className="mt-6 text-base font-semibold">{t.basisTitle}</h2>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6">
        {result.assumptionIds.map((id) => (
          <li key={id}>{t.assumptions[id]}</li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-6">{t.checkedOn}</p>
      <p className="mt-2 text-sm leading-6">{t.officialNote}</p>
      <Link href="/sources" className="mt-2 inline-block text-sm text-teal-900 underline">
        {t.sourcesLink}
      </Link>

      <button type="button" onClick={onEdit} className="mt-6 text-sm text-teal-900 underline">
        {t.editAnswers}
      </button>
      <FeedbackForm input={input} result={result} />
    </div>
  );
}

function headlineReasonText(
  input: EstimateInput,
  result: EstimateResult,
  t: ReturnType<typeof useI18n>["t"],
  ratioLabel: string,
): string | null {
  if (result.serviceUnknown && result.food.kind === "amount") {
    return t.headlineReasonUnreduced;
  }
  if (result.serviceAmountKind === "paid") {
    return t.headlineReasonPaid;
  }
  if (result.serviceBaseIsAssumption && input.usagePreset) {
    const share = Math.round(PRESET_SHARE[input.usagePreset] * 100);
    return t.headlineReasonPreset.replace("{share}", String(share));
  }
  if (result.serviceAmountKind === "gross") {
    if (result.decision.status === "single") {
      return `${t.headlineReasonGross} ${t.headlineReasonRatio.replace("{ratio}", ratioLabel)}`;
    }
    return t.headlineReasonGross;
  }
  if (result.decision.status === "single" && !result.serviceUnknown) {
    return t.headlineReasonRatio.replace("{ratio}", ratioLabel);
  }
  return null;
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[1fr_auto] sm:gap-4">
      <dt className="text-sm text-stone-700">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}
