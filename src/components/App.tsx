"use client";

import { useEffect, useMemo, useState } from "react";
import { estimate } from "@/src/rules/estimate";
import { pensionAloneKeeps10 } from "@/src/rules/copayRatio";
import type {
  AgeBand,
  CareLevel,
  CertStage,
  CertStatus,
  EstimateInput,
  Household65,
  OtherIncome,
  Place,
  ResidentTax,
  RoomType,
  ServiceAmountKind,
  UsagePreset,
} from "@/src/rules/types";
import { manToYen, parseYen } from "@/src/lib/money";
import { LanguageSwitch } from "./LanguageSwitch";
import { useI18n } from "./Providers";
import { ResultView } from "./ResultView";

const DRAFT_KEY = "kaigo-draft-v2";

type Step = "start" | "who" | "income" | "usage" | "result";
type ServicePath = "known" | "preset" | "skip" | null;

type Draft = {
  step: Step;
  ageBand: AgeBand | null;
  careLevel: CareLevel | null;
  place: Place | null;
  residentTax: ResidentTax | null;
  pensionMan: string;
  otherIncome: OtherIncome | null;
  otherMan: string;
  household65: Household65 | null;
  othersMan: string;
  showExtraIncome: boolean;
  servicePath: ServicePath;
  serviceAmountKind: ServiceAmountKind | null;
  serviceYen: string;
  usagePreset: UsagePreset | null;
  knowFood: "yes" | "no" | null;
  foodYen: string;
  roomType: RoomType | null;
  certStatus: CertStatus | null;
  certStage: CertStage | null;
  assumeGeneralTaxableHousehold: boolean;
};

const INITIAL: Draft = {
  step: "start",
  ageBand: null,
  careLevel: null,
  place: null,
  residentTax: null,
  pensionMan: "",
  otherIncome: null,
  otherMan: "",
  household65: null,
  othersMan: "",
  showExtraIncome: false,
  servicePath: null,
  serviceAmountKind: null,
  serviceYen: "",
  usagePreset: null,
  knowFood: null,
  foodYen: "",
  roomType: null,
  certStatus: null,
  certStage: null,
  assumeGeneralTaxableHousehold: false,
};

const LEVELS: Array<Exclude<CareLevel, "unknown">> = [
  "support1",
  "support2",
  "care1",
  "care2",
  "care3",
  "care4",
  "care5",
];

export function App() {
  const { t } = useI18n();
  const [draft, setDraft] = useState<Draft>(INITIAL);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        setDraft({ ...INITIAL, ...(JSON.parse(saved) as Draft) });
      } catch {
        setDraft(INITIAL);
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft, ready]);

  const input = useMemo(() => toInput(draft), [draft]);
  const result = useMemo(() => (input ? estimate(input) : null), [input]);
  const lowPensionAlone = pensionAloneKeeps10(manToYen(draft.pensionMan));
  const hideExtraByDefault = lowPensionAlone && !draft.showExtraIncome;

  function patch(partial: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-4 py-5">
      <header className="mb-6 flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-teal-900">{t.brand}</p>
        <LanguageSwitch />
      </header>

      {draft.step === "start" ? (
        <section>
          <h1 className="text-2xl font-semibold leading-snug">{t.question}</h1>
          <button type="button" className="mt-6 w-full rounded bg-teal-800 px-4 py-3 text-white" onClick={() => patch({ step: "who" })}>
            {t.start}
          </button>
          <p className="mt-3 text-sm text-stone-600">{t.disclaimerShort}</p>
        </section>
      ) : null}

      {draft.step === "who" ? (
        <section>
          <StepTitle title={t.stepWho} note={t.aboutMinute} />
          <Choice
            label={t.age}
            value={draft.ageBand}
            options={[
              ["40-64", t.age4064],
              ["65plus", t.age65],
              ["unknown", t.ageUnknown],
            ]}
            onChange={(ageBand) => patch({ ageBand: ageBand as AgeBand })}
          />
          <Choice
            label={t.careLevel}
            value={draft.careLevel}
            options={[...LEVELS.map((id) => [id, t.levels[id]] as [string, string]), ["unknown", t.careUnknown]]}
            onChange={(careLevel) => patch({ careLevel: careLevel as CareLevel })}
          />
          <Choice
            label={t.place}
            value={draft.place}
            options={[
              ["home", t.placeHome],
              ["facility", t.placeFacility],
              ["undecided", t.placeUndecided],
            ]}
            onChange={(place) => patch({ place: place as Place })}
          />
          <Nav
            backLabel={t.back}
            nextLabel={t.next}
            canNext={Boolean(draft.ageBand && draft.careLevel && draft.place)}
            onBack={() => patch({ step: "start" })}
            onNext={() => patch({ step: draft.ageBand === "40-64" ? "usage" : "income" })}
          />
        </section>
      ) : null}

      {draft.step === "income" ? (
        <section>
          <StepTitle title={t.stepIncome} note={t.aboutMinute} />
          {draft.ageBand === "40-64" ? <p className="text-sm leading-6">{t.skipIncome}</p> : null}
          {draft.ageBand !== "40-64" ? (
            <>
              <Choice
                label={t.tax}
                hint={t.taxHint}
                value={draft.residentTax}
                options={[
                  ["taxable", t.taxYes],
                  ["exempt", t.taxNo],
                  ["unknown", t.taxUnknown],
                ]}
                onChange={(residentTax) => patch({ residentTax: residentTax as ResidentTax })}
              />
              <label className="mt-5 block text-sm font-semibold">
                {t.pension}
                <span className="mt-1 block font-normal text-stone-600">{t.pensionHint}</span>
                <span className="mt-2 flex items-center gap-2 font-normal">
                  <input
                    inputMode="decimal"
                    value={draft.pensionMan}
                    onChange={(event) => patch({ pensionMan: event.target.value, showExtraIncome: false })}
                    className="w-full rounded border border-stone-300 bg-white p-3"
                  />
                  {t.manYen}
                </span>
              </label>
              {hideExtraByDefault ? (
                <div className="mt-5">
                  <p className="text-sm leading-6 text-stone-700">{t.pensionLowAssumption}</p>
                  <button
                    type="button"
                    className="mt-2 text-sm text-teal-900 underline"
                    onClick={() => patch({ showExtraIncome: true })}
                  >
                    {t.revealExtraIncome}
                  </button>
                </div>
              ) : (
                <>
                  {lowPensionAlone && draft.showExtraIncome ? (
                    <button
                      type="button"
                      className="mt-5 text-sm text-teal-900 underline"
                      onClick={() =>
                        patch({
                          showExtraIncome: false,
                          otherIncome: null,
                          otherMan: "",
                          household65: null,
                          othersMan: "",
                        })
                      }
                    >
                      {t.hideExtraIncome}
                    </button>
                  ) : null}
                  <Choice
                    label={t.otherIncome}
                    value={draft.otherIncome}
                    options={[
                      ["none", t.otherNone],
                      ["known", t.otherKnown],
                      ["unknown", t.otherUnknown],
                    ]}
                    onChange={(otherIncome) => patch({ otherIncome: otherIncome as OtherIncome })}
                  />
                  {draft.otherIncome === "known" ? (
                    <label className="mt-3 block text-sm">
                      {t.otherAmount}
                      <span className="mt-1 flex items-center gap-2">
                        <input
                          inputMode="decimal"
                          value={draft.otherMan}
                          onChange={(event) => patch({ otherMan: event.target.value })}
                          className="w-full rounded border border-stone-300 bg-white p-3"
                        />
                        {t.manYen}
                      </span>
                    </label>
                  ) : null}
                  <Choice
                    label={t.household}
                    hint={t.householdHint}
                    value={draft.household65}
                    options={[
                      ["alone", t.alone],
                      ["withOthers", t.withOthers],
                      ["unknown", t.householdUnknown],
                    ]}
                    onChange={(household65) => patch({ household65: household65 as Household65 })}
                  />
                  {draft.household65 === "withOthers" ? (
                    <label className="mt-3 block text-sm">
                      {t.othersPension}
                      <span className="mt-1 flex items-center gap-2">
                        <input
                          inputMode="decimal"
                          value={draft.othersMan}
                          onChange={(event) => patch({ othersMan: event.target.value })}
                          className="w-full rounded border border-stone-300 bg-white p-3"
                        />
                        {t.manYen}
                      </span>
                    </label>
                  ) : null}
                </>
              )}
            </>
          ) : null}
          <Nav
            backLabel={t.back}
            nextLabel={t.next}
            canNext={incomeReady(draft)}
            onBack={() => patch({ step: "who" })}
            onNext={() => patch({ step: "usage" })}
          />
        </section>
      ) : null}

      {draft.step === "usage" ? (
        <section>
          <StepTitle title={t.stepUsage} note={t.aboutMinute} />
          <Choice
            label={draft.place === "facility" ? t.facilityService : t.servicePathLabel}
            value={draft.servicePath}
            options={
              draft.place === "facility"
                ? [
                    ["known", t.serviceKnown],
                    ["skip", t.facilityServiceUnknown],
                  ]
                : [
                    ["known", t.serviceKnown],
                    ["preset", t.serviceUnknownChoice],
                    ["skip", t.serviceSkipChoice],
                  ]
            }
            onChange={(servicePath) =>
              patch({
                servicePath: servicePath as ServicePath,
                usagePreset: null,
                serviceAmountKind: null,
                serviceYen: "",
              })
            }
          />
          {draft.servicePath === "known" ? (
            <>
              <Choice
                label={t.serviceAmountKindLabel}
                value={draft.serviceAmountKind}
                options={[
                  ["paid", t.serviceAmountPaid],
                  ["gross", t.serviceAmountGross],
                ]}
                onChange={(serviceAmountKind) =>
                  patch({ serviceAmountKind: serviceAmountKind as ServiceAmountKind })
                }
              />
              <label className="mt-3 block text-sm">
                {t.serviceAmount}
                <span className="mt-1 flex items-center gap-2">
                  <input
                    inputMode="numeric"
                    value={draft.serviceYen}
                    onChange={(event) => patch({ serviceYen: event.target.value })}
                    className="w-full rounded border border-stone-300 bg-white p-3"
                  />
                  {t.yenPerMonth}
                </span>
              </label>
            </>
          ) : null}
          {draft.servicePath === "preset" && draft.place !== "facility" ? (
            <>
              <p className="mt-2 text-sm text-stone-600">{t.presetHint}</p>
              <Choice
                label=""
                value={draft.usagePreset}
                options={[
                  ["light", t.presetLight],
                  ["typical", t.presetTypical],
                  ["nearLimit", t.presetNear],
                ]}
                onChange={(usagePreset) => patch({ usagePreset: usagePreset as UsagePreset })}
              />
            </>
          ) : null}
          {draft.place === "facility" ? (
            <>
              <Choice
                label={t.foodContract}
                value={draft.knowFood}
                options={[
                  ["yes", t.foodContract],
                  ["no", t.foodContractUnknown],
                ]}
                onChange={(knowFood) => patch({ knowFood: knowFood as "yes" | "no" })}
              />
              {draft.knowFood === "yes" ? (
                <label className="mt-3 block text-sm">
                  {t.foodContract}
                  <span className="mt-1 flex items-center gap-2">
                    <input
                      inputMode="numeric"
                      value={draft.foodYen}
                      onChange={(event) => patch({ foodYen: event.target.value })}
                      className="w-full rounded border border-stone-300 bg-white p-3"
                    />
                    {t.yenPerMonth}
                  </span>
                </label>
              ) : null}
              <Choice
                label={t.room}
                value={draft.roomType}
                options={[
                  ["multi", t.roomMulti],
                  ["traditionalPrivate", t.roomPrivate],
                  ["unitPrivate", t.roomUnit],
                  ["unknown", t.roomUnknown],
                ]}
                onChange={(roomType) => patch({ roomType: roomType as RoomType })}
              />
              <Choice
                label={t.cert}
                value={draft.certStatus}
                options={[
                  ["none", t.certNone],
                  ["has", t.certHas],
                  ["unknown", t.certUnknown],
                ]}
                onChange={(certStatus) => patch({ certStatus: certStatus as CertStatus })}
              />
              {draft.certStatus === "has" ? (
                <Choice
                  label={t.stage}
                  value={draft.certStage}
                  options={[
                    ["1", t.stage1],
                    ["2", t.stage2],
                    ["3-1", t.stage31],
                    ["3-2", t.stage32],
                    ["unknown", t.stageUnknown],
                  ]}
                  onChange={(certStage) => patch({ certStage: certStage as CertStage })}
                />
              ) : null}
            </>
          ) : null}
          <Nav
            backLabel={t.back}
            nextLabel={t.seeResult}
            canNext={usageReady(draft) && input != null}
            onBack={() => patch({ step: draft.ageBand === "40-64" ? "who" : "income" })}
            onNext={() => patch({ step: "result" })}
          />
        </section>
      ) : null}

      {draft.step === "result" && input && result ? (
        <ResultView
          input={input}
          result={result}
          onEdit={() => patch({ step: "who" })}
          onAssumeTaxable={(assumeGeneralTaxableHousehold) => patch({ assumeGeneralTaxableHousehold })}
        />
      ) : null}

      <p className="mt-10 text-xs leading-5 text-stone-500">{t.footerNote}</p>
    </main>
  );
}

function incomeReady(draft: Draft): boolean {
  if (draft.ageBand === "40-64") return true;
  if (!draft.residentTax) return false;
  const lowAlone = pensionAloneKeeps10(manToYen(draft.pensionMan));
  if (lowAlone && !draft.showExtraIncome) return true;
  if (!draft.otherIncome || !draft.household65) return false;
  if (draft.otherIncome === "known" && manToYen(draft.otherMan) == null) return false;
  return true;
}

function usageReady(draft: Draft): boolean {
  if (!draft.servicePath) return false;
  if (draft.servicePath === "known") {
    if (!draft.serviceAmountKind || parseYen(draft.serviceYen) == null) return false;
  }
  if (draft.servicePath === "preset" && draft.place !== "facility" && !draft.usagePreset) return false;
  if (draft.place === "facility") {
    if (!draft.knowFood || !draft.roomType || !draft.certStatus) return false;
    if (draft.knowFood === "yes" && parseYen(draft.foodYen) == null) return false;
    if (draft.certStatus === "has" && !draft.certStage) return false;
  }
  return true;
}

function toInput(draft: Draft): EstimateInput | null {
  if (!draft.ageBand || !draft.careLevel || !draft.place) return null;
  if (!usageReady(draft)) return null;
  if (draft.ageBand !== "40-64" && !incomeReady(draft)) return null;

  const lowAlone = pensionAloneKeeps10(manToYen(draft.pensionMan));
  const useDefaultExtras = draft.ageBand !== "40-64" && lowAlone && !draft.showExtraIncome;

  return {
    ageBand: draft.ageBand,
    careLevel: draft.careLevel,
    place: draft.place,
    residentTax: draft.ageBand === "40-64" ? "unknown" : (draft.residentTax ?? "unknown"),
    pensionYen: manToYen(draft.pensionMan),
    otherIncome:
      draft.ageBand === "40-64" || useDefaultExtras ? "none" : (draft.otherIncome ?? "unknown"),
    otherIncomeYen: !useDefaultExtras && draft.otherIncome === "known" ? manToYen(draft.otherMan) : null,
    household65:
      draft.ageBand === "40-64" || useDefaultExtras ? "alone" : (draft.household65 ?? "unknown"),
    othersPensionYen:
      !useDefaultExtras && draft.household65 === "withOthers" ? manToYen(draft.othersMan) : null,
    serviceFeeYen: draft.servicePath === "known" ? parseYen(draft.serviceYen) : null,
    serviceAmountKind: draft.servicePath === "known" ? draft.serviceAmountKind : null,
    usagePreset: draft.servicePath === "preset" && draft.place !== "facility" ? draft.usagePreset : null,
    foodRoomContractYen: draft.place === "facility" && draft.knowFood === "yes" ? parseYen(draft.foodYen) : null,
    roomType: draft.roomType ?? "unknown",
    certStatus: draft.certStatus ?? "unknown",
    certStage: draft.certStage ?? "unknown",
    assumeGeneralTaxableHousehold: draft.assumeGeneralTaxableHousehold,
  };
}

function StepTitle({ title, note }: { title: string; note: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-stone-500">{note}</p>
    </div>
  );
}

function Choice({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string | null;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="mt-5">
      {label ? <legend className="text-sm font-semibold">{label}</legend> : null}
      {hint ? <p className="mt-1 text-sm text-stone-600">{hint}</p> : null}
      <div className="mt-2 grid gap-2">
        {options.map(([id, text]) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={
              value === id
                ? "rounded border border-teal-800 bg-teal-50 px-3 py-3 text-left"
                : "rounded border border-stone-300 bg-white px-3 py-3 text-left"
            }
            aria-pressed={value === id}
          >
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Nav({
  backLabel,
  nextLabel,
  canNext,
  onBack,
  onNext,
}: {
  backLabel: string;
  nextLabel: string;
  canNext: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3">
      <button type="button" onClick={onBack} className="rounded border border-stone-300 bg-white px-4 py-3">
        {backLabel}
      </button>
      <button type="button" onClick={onNext} disabled={!canNext} className="rounded bg-teal-800 px-4 py-3 text-white disabled:bg-stone-300">
        {nextLabel}
      </button>
    </div>
  );
}
