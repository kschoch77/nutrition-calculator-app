import { z } from "zod";
import type { ProfileInput } from "@/types/nutrition";

/**
 * Helpers
 */
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/**
 * BF% normalization:
 * - User SHOULD enter 20 meaning 20%
 * - If they enter 0.2, we'll convert -> 20
 */
export function normalizeBodyFatPercent(raw: number): number {
  if (!Number.isFinite(raw)) return raw;
  // Heuristic: if 0 < value <= 1, treat as fraction (0.2 -> 20)
  if (raw > 0 && raw <= 1) return raw * 100;
  return raw;
}

/**
 * Schema for "form values" (strings + numbers).
 * We'll transform this into our ProfileInput shape.
 */
export const profileFormSchema = z
  .object({
    unitSystem: z.enum(["us", "metric"]),
    sex: z.enum(["male", "female"]),
    ageYears: z.coerce.number().int().positive("Age must be a positive whole number"),

    // Height/weight are split by unit system; we validate depending on selected unit
    heightInches: z.coerce.number().optional(),
    heightCm: z.coerce.number().optional(),
    weightLb: z.coerce.number().optional(),
    weightKg: z.coerce.number().optional(),

    bodyFatMode: z.enum(["known", "unknown"]),
    bodyFatPercent: z.coerce.number().optional(),

    activityPreset: z.coerce.number().optional(), // 1.2, 1.375, ...
    activityUseCustom: z.coerce.boolean().default(false),
    activityCustom: z.coerce.number().optional(),

    cutDelta: z.coerce.number().default(-500),
    bulkDelta: z.coerce.number().default(500),
    recompDelta: z.coerce.number().default(-200),

    bulkProteinGPerLb: z.coerce.number().default(1.0),

    dexaEnabled: z.coerce.boolean().default(false),
    dexaFatMassKg: z.coerce.number().optional(),
    dexaLeanMassKg: z.coerce.number().optional(),
  })
  .superRefine((val, ctx) => {
    // Unit-dependent required fields
    if (val.unitSystem === "us") {
      if (!val.heightInches || val.heightInches <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Height (inches) is required",
          path: ["heightInches"],
        });
      }
      if (!val.weightLb || val.weightLb <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Weight (lb) is required",
          path: ["weightLb"],
        });
      }
    } else {
      if (!val.heightCm || val.heightCm <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Height (cm) is required",
          path: ["heightCm"],
        });
      }
      if (!val.weightKg || val.weightKg <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Weight (kg) is required",
          path: ["weightKg"],
        });
      }
    }

    // BF% required if mode is known
    if (val.bodyFatMode === "known") {
      if (val.bodyFatPercent == null || !Number.isFinite(val.bodyFatPercent)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Body fat % is required when you choose “I know my BF%”",
          path: ["bodyFatPercent"],
        });
      }
    }

    // Activity multiplier
    if (val.activityUseCustom) {
      if (val.activityCustom == null || !Number.isFinite(val.activityCustom)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Custom activity multiplier is required",
          path: ["activityCustom"],
        });
      }
    } else {
      if (val.activityPreset == null || !Number.isFinite(val.activityPreset)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Choose an activity preset (or enable custom)",
          path: ["activityPreset"],
        });
      }
    }

    // DEXA: if enabled, at least one of the masses should exist
    if (val.dexaEnabled) {
      const hasFat = val.dexaFatMassKg != null && Number.isFinite(val.dexaFatMassKg) && val.dexaFatMassKg > 0;
      const hasLean = val.dexaLeanMassKg != null && Number.isFinite(val.dexaLeanMassKg) && val.dexaLeanMassKg > 0;
      if (!hasFat && !hasLean) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "If DEXA is enabled, enter fat mass, lean mass, or both.",
          path: ["dexaFatMassKg"],
        });
      }
    }

    // Bulk protein slider bounds (0.7 to 1.0)
    if (!Number.isFinite(val.bulkProteinGPerLb)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bulk protein target must be a number",
        path: ["bulkProteinGPerLb"],
      });
    } else {
      if (val.bulkProteinGPerLb < 0.7 || val.bulkProteinGPerLb > 1.0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Bulk protein target should be between 0.7 and 1.0 g/lb",
          path: ["bulkProteinGPerLb"],
        });
      }
    }
  });

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

/**
 * Convert validated form values into ProfileInput (our app's canonical shape).
 */
export function toProfileInput(v: ProfileFormValues): ProfileInput {
  const activityMultiplier = v.activityUseCustom
    ? (v.activityCustom as number)
    : (v.activityPreset as number);

  const bfPercent =
    v.bodyFatMode === "known" && v.bodyFatPercent != null
      ? normalizeBodyFatPercent(v.bodyFatPercent)
      : undefined;

  // Give a gentle clamp to BF% if user enters something wild (still allow Zod to enforce presence)
  const normalizedBf =
    bfPercent != null ? clamp(bfPercent, 0, 80) : undefined;

  return {
    unitSystem: v.unitSystem,
    sex: v.sex,
    ageYears: v.ageYears,

    height: {
      inches: v.unitSystem === "us" ? v.heightInches : undefined,
      cm: v.unitSystem === "metric" ? v.heightCm : undefined,
    },

    weight: {
      lb: v.unitSystem === "us" ? v.weightLb : undefined,
      kg: v.unitSystem === "metric" ? v.weightKg : undefined,
    },

    bodyFatMode: v.bodyFatMode,
    bodyFatPercent: normalizedBf,

    activity: {
      preset: v.activityUseCustom ? undefined : (v.activityPreset as any),
      useCustom: v.activityUseCustom,
      customMultiplier: v.activityUseCustom ? v.activityCustom : undefined,
    },

    deltas: {
      cut: v.cutDelta,
      bulk: v.bulkDelta,
      recomp: v.recompDelta,
    },

    bulkProteinGPerLb: v.bulkProteinGPerLb,

    dexa: {
      enabled: v.dexaEnabled,
      fatMassKg: v.dexaEnabled ? v.dexaFatMassKg : undefined,
      leanMassKg: v.dexaEnabled ? v.dexaLeanMassKg : undefined,
    },
  };
}
