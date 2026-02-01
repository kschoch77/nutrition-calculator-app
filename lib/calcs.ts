import type { ProfileInput } from "@/types/nutrition";

/* =========================
   Helpers
========================= */

const round = (n: number) => Math.round(n);

const lbToKg = (lb: number) => lb * 0.45359237;
const inToCm = (inches: number) => inches * 2.54;

/* =========================
   Types
========================= */

export type BmrBreakdown = {
  recommendedBmr: number;
  methods: {
    mifflin?: number;
    revisedHarrisBenedict?: number;
    katchMcArdle?: number;
    nelson?: number;
    muller?: number;
  };
};

export type MacroTargets = {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
};

export type Results = {
  bmr: BmrBreakdown;
  tdee: number;
  maintenance: MacroTargets;
  cut: MacroTargets;
  bulk: MacroTargets;
  recomp: MacroTargets;
  warnings: string[];
};

/* =========================
   Core calculations
========================= */

export function calculateAll(input: ProfileInput): Results {
  const warnings: string[] = [];

  /* ---- Normalize units ---- */
  const weightKg =
    input.unitSystem === "us"
      ? lbToKg(input.weight.lb!)
      : input.weight.kg!;

  const weightLb = weightKg / 0.45359237;

  const heightCm =
    input.unitSystem === "us"
      ? inToCm(input.height.inches!)
      : input.height.cm!;

  const sexFactor = input.sex === "male" ? 5 : -161;

  /* ---- Body composition ---- */
  let fatMassKg: number | undefined;
  let leanMassKg: number | undefined;

  if (input.dexa.enabled) {
    fatMassKg = input.dexa.fatMassKg;
    leanMassKg = input.dexa.leanMassKg;
  }

  if (
    (!fatMassKg || !leanMassKg) &&
    input.bodyFatMode === "known" &&
    input.bodyFatPercent != null
  ) {
    fatMassKg = weightKg * (input.bodyFatPercent / 100);
    leanMassKg = weightKg - fatMassKg;
  }

  /* ---- BMR formulas ---- */

  const mifflin =
    10 * weightKg + 6.25 * heightCm - 5 * input.ageYears + sexFactor;

  const revisedHarrisBenedict =
    input.sex === "male"
      ? 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * input.ageYears
      : 447.593 +
        9.247 * weightKg +
        3.098 * heightCm -
        4.33 * input.ageYears;

  const katchMcArdle =
    leanMassKg != null ? 370 + 21.6 * leanMassKg : undefined;

  const nelson =
    fatMassKg != null && leanMassKg != null
      ? 25.8 * leanMassKg + 4.04 * fatMassKg
      : undefined;

  const muller =
    fatMassKg != null && leanMassKg != null
      ? 13.587 * leanMassKg + 9.613 * fatMassKg + 198
      : undefined;

  /* ---- Recommended BMR ---- */
  let recommendedBmr: number;

  if (input.bodyFatMode === "known" && katchMcArdle != null) {
    recommendedBmr = katchMcArdle;
  } else {
    recommendedBmr = (mifflin + revisedHarrisBenedict) / 2;
  }

  /* ---- TDEE ---- */
  const activityMultiplier = input.activity.useCustom
    ? input.activity.customMultiplier!
    : input.activity.preset!;

  const tdee = recommendedBmr * activityMultiplier;

  /* =========================
     Macro calculations
  ========================= */

  const makeMacros = (
    calories: number,
    proteinG: number,
    fatPercent: number
  ): MacroTargets => {
    const fatCalories = calories * fatPercent;
    const fatG = fatCalories / 9;

    if (fatG < 50) {
      warnings.push("Fat intake is below 50 g/day.");
    }

    const remainingCalories =
      calories - proteinG * 4 - fatG * 9;

    const carbsG = remainingCalories / 4;

    return {
      calories: round(calories),
      proteinG: round(proteinG),
      fatG: round(fatG),
      carbsG: round(carbsG),
    };
  };

  /* ---- Maintenance ---- */
  const maintenance = makeMacros(
    tdee,
    weightLb * 1.0,
    0.25
  );

  /* ---- Cut ---- */
  const cut = makeMacros(
    tdee + input.deltas.cut,
    weightLb * 1.0,
    0.25
  );

  /* ---- Recomp ---- */
  const recomp = makeMacros(
    tdee + input.deltas.recomp,
    weightLb * 1.0,
    0.2
  );

  /* ---- Bulk ---- */
  const bulkProtein = weightLb * input.bulkProteinGPerLb;

  const bulk = makeMacros(
    tdee + input.deltas.bulk,
    bulkProtein,
    0.3
  );

  /* ========================= */

  return {
    bmr: {
      recommendedBmr: round(recommendedBmr),
      methods: {
        mifflin: round(mifflin),
        revisedHarrisBenedict: round(revisedHarrisBenedict),
        katchMcArdle: katchMcArdle ? round(katchMcArdle) : undefined,
        nelson: nelson ? round(nelson) : undefined,
        muller: muller ? round(muller) : undefined,
      },
    },
    tdee: round(tdee),
    maintenance,
    cut,
    bulk,
    recomp,
    warnings,
  };
}
