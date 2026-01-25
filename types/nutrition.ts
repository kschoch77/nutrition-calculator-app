export type Sex = "male" | "female";
export type UnitSystem = "us" | "metric";

export type ActivityPreset = 1.2 | 1.375 | 1.55 | 1.725 | 1.9;
export type BodyFatMode = "known" | "unknown";

export type DexaInput = {
  enabled: boolean;
  fatMassKg?: number;
  leanMassKg?: number;
};

export type ProfileInput = {
  unitSystem: UnitSystem;
  sex: Sex;
  ageYears: number;

  height: { cm?: number; inches?: number };
  weight: { kg?: number; lb?: number };

  bodyFatMode: BodyFatMode;
  bodyFatPercent?: number;

  activity: {
    preset?: ActivityPreset;
    useCustom: boolean;
    customMultiplier?: number;
  };

  deltas: {
    cut: number;
    bulk: number;
    recomp: number;
  };

  bulkProteinGPerLb: number;
  dexa: DexaInput;
};
