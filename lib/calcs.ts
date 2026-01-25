import { ProfileInput } from "@/types/nutrition";

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

export function calculateAll(_input: ProfileInput): Results {
  throw new Error("Not implemented yet");
}
