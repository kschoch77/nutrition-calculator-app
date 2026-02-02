"use client";

import { useEffect } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  profileFormSchema,
  type ProfileFormValues,
  toProfileInput,
  normalizeBodyFatPercent,
} from "@/lib/schema";
import type { ProfileInput } from "@/types/nutrition";

type Props = {
  initialValues?: Partial<ProfileFormValues>;
  onChange: (input: ProfileInput) => void;
};

const ACTIVITY_PRESETS = [
  { label: "Sedentary (1.2)", value: 1.2 },
  { label: "Light (1.375)", value: 1.375 },
  { label: "Moderate (1.55)", value: 1.55 },
  { label: "Very (1.725)", value: 1.725 },
  { label: "Extreme (1.9)", value: 1.9 },
];

export function ProfileForm({ initialValues, onChange }: Props) {
  const form = useForm({
    resolver: zodResolver(profileFormSchema),
    mode: "onChange",
    defaultValues: {
      unitSystem: "us",
      sex: "male",
      ageYears: 30,

      height: { inches: 70 },
      weight: { lb: 180 },

      bodyFatMode: "unknown",
      bodyFatPercent: undefined,

      activityPreset: 1.55,
      activityUseCustom: false,
      activityCustom: undefined,

      cutDelta: -500,
      bulkDelta: 500,
      recompDelta: -200,

      bulkProteinGPerLb: 1.0,

      dexaEnabled: false,
      dexaFatMassKg: undefined,
      dexaLeanMassKg: undefined,

      ...initialValues,
    } satisfies ProfileFormValues,
  });

  const { register, watch, formState, setValue, getValues } = form;
  const { errors, isValid } = formState;

  const unitSystem = watch("unitSystem");
  const bodyFatMode = watch("bodyFatMode");
  const activityUseCustom = !!watch("activityUseCustom");
  const dexaEnabled = !!watch("dexaEnabled");

  // Live-calculate: when the form becomes valid, push ProfileInput upward
  useEffect(() => {
    const sub = watch(() => {
      const vals = getValues();
      const parsed = profileFormSchema.safeParse(vals);
      if (parsed.success) {
        onChange(toProfileInput(parsed.data));
      }
    });
    return () => sub.unsubscribe();
  }, [watch, getValues, onChange]);

  // If unit system changes, don't keep stale fields "required but hidden"
  useEffect(() => {
    if (unitSystem === "us") {
      // Clear metric fields
      setValue("height.cm", undefined);
      setValue("weight.kg", undefined);
    } else {
      // Clear us fields
      setValue("height.inches", undefined);
      setValue("weight.lb", undefined);
    }
  }, [unitSystem, setValue]);

  const FieldError = ({ name }: { name: FieldPath<ProfileFormValues> }) => {
    const leaf = name
      .split(".")
      .reduce(
        (acc, key) => (acc && typeof acc === "object" ? (acc as any)[key] : undefined),
        errors as unknown,
      ) as any;
    const msg = leaf?.message;
    if (!msg) return null;
    return <div className="mt-1 text-xs text-red-600">{String(msg)}</div>;
  };

  return (
    <form className="space-y-6">
      {/* Units */}
      <section className="rounded-2xl border p-4">
        <h2 className="text-lg font-semibold">Profile</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <div className="text-sm font-medium">Units</div>
            <select
              className="w-full rounded-xl border px-3 py-2"
              {...register("unitSystem")}
            >
              <option value="us">US (lb / in)</option>
              <option value="metric">Metric (kg / cm)</option>
            </select>
            <FieldError name="unitSystem" />
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Sex</div>
            <select className="w-full rounded-xl border px-3 py-2" {...register("sex")}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            <FieldError name="sex" />
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Age (years)</div>
            <input
              className="w-full rounded-xl border px-3 py-2"
              type="number"
              step="1"
              {...register("ageYears", { valueAsNumber: true })}
            />
            <FieldError name="ageYears" />
          </label>

          {unitSystem === "us" ? (
            <>
              <label className="space-y-1">
                <div className="text-sm font-medium">Height (inches)</div>
                <input
              className="w-full rounded-xl border px-3 py-2"
              type="number"
              step="0.1"
              {...register("height.inches", { valueAsNumber: true })}
            />
            <FieldError name="height.inches" />
          </label>

              <label className="space-y-1">
                <div className="text-sm font-medium">Weight (lb)</div>
                <input
              className="w-full rounded-xl border px-3 py-2"
              type="number"
              step="0.1"
              {...register("weight.lb", { valueAsNumber: true })}
            />
            <FieldError name="weight.lb" />
          </label>
            </>
          ) : (
            <>
              <label className="space-y-1">
                <div className="text-sm font-medium">Height (cm)</div>
                <input
              className="w-full rounded-xl border px-3 py-2"
              type="number"
              step="0.1"
              {...register("height.cm", { valueAsNumber: true })}
            />
            <FieldError name="height.cm" />
          </label>

              <label className="space-y-1">
                <div className="text-sm font-medium">Weight (kg)</div>
                <input
              className="w-full rounded-xl border px-3 py-2"
              type="number"
              step="0.1"
              {...register("weight.kg", { valueAsNumber: true })}
            />
            <FieldError name="weight.kg" />
          </label>
            </>
          )}
        </div>
      </section>

      {/* Body Fat */}
      <section className="rounded-2xl border p-4">
        <h2 className="text-lg font-semibold">Body Composition</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <div className="text-sm font-medium">Body fat input</div>
            <select
              className="w-full rounded-xl border px-3 py-2"
              {...register("bodyFatMode")}
            >
              <option value="unknown">I don't know my BF%</option>
              <option value="known">I know my BF%</option>
            </select>
            <FieldError name="bodyFatMode" />
          </label>

          {bodyFatMode === "known" ? (
            <label className="space-y-1">
              <div className="text-sm font-medium">Body fat % (enter 20, not 0.2)</div>
              <input
                className="w-full rounded-xl border px-3 py-2"
                type="number"
                step="0.1"
                {...register("bodyFatPercent", { valueAsNumber: true })}
                onBlur={(e) => {
                  const raw = Number(e.target.value);
                  if (Number.isFinite(raw)) {
                    const normalized = normalizeBodyFatPercent(raw);
                    if (normalized !== raw) {
                      setValue("bodyFatPercent", Number(normalized.toFixed(1)), {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }
                  }
                }}
              />
              <FieldError name="bodyFatPercent" />
            </label>
          ) : (
            <div className="text-sm text-gray-600">
              We'll use the average of Revised Harris-Benedict and Mifflin-St Jeor for BMR.
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input type="checkbox" {...register("dexaEnabled")} />
          <span className="text-sm font-medium">I have DEXA results (Advanced)</span>
        </div>

        {dexaEnabled && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <div className="text-sm font-medium">DEXA Fat Mass (kg)</div>
              <input
                className="w-full rounded-xl border px-3 py-2"
                type="number"
                step="0.1"
                {...register("dexaFatMassKg", { valueAsNumber: true })}
              />
              <FieldError name="dexaFatMassKg" />
            </label>

            <label className="space-y-1">
              <div className="text-sm font-medium">DEXA Lean Mass (kg)</div>
              <input
                className="w-full rounded-xl border px-3 py-2"
                type="number"
                step="0.1"
                {...register("dexaLeanMassKg", { valueAsNumber: true })}
              />
              <FieldError name="dexaLeanMassKg" />
            </label>

            <p className="sm:col-span-2 text-xs text-gray-600">
              If enabled, we'll use these to compute FM/FFM and show Nelson/Muller (Advanced).
            </p>
          </div>
        )}
      </section>

      {/* Activity */}
      <section className="rounded-2xl border p-4">
        <h2 className="text-lg font-semibold">Activity</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <div className="text-sm font-medium">Preset</div>
            <select
              className="w-full rounded-xl border px-3 py-2"
              disabled={activityUseCustom}
              {...register("activityPreset", {
                setValueAs: (value) => (value === "" ? undefined : Number(value)),
              })}
            >
              {ACTIVITY_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <FieldError name="activityPreset" />
          </label>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" {...register("activityUseCustom")} />
              Use custom multiplier
            </label>

            {activityUseCustom && (
              <label className="space-y-1">
                <div className="text-sm font-medium">Custom multiplier</div>
                <input
                  className="w-full rounded-xl border px-3 py-2"
                  type="number"
                  step="0.01"
                  {...register("activityCustom", { valueAsNumber: true })}
                />
                <FieldError name="activityCustom" />
              </label>
            )}
          </div>
        </div>
      </section>

      {/* Deltas + Bulk protein */}
      <section className="rounded-2xl border p-4">
        <h2 className="text-lg font-semibold">Goal Adjustments</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <div className="text-sm font-medium">Cut delta (kcal/day)</div>
            <input
              className="w-full"
              type="range"
              min={-1000}
              max={0}
              step={25}
              {...register("cutDelta", { valueAsNumber: true })}
            />
            <div className="text-xs text-gray-600">{Number(watch("cutDelta") ?? 0)} kcal/day</div>
            <FieldError name="cutDelta" />
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Bulk delta (kcal/day)</div>
            <input
              className="w-full"
              type="range"
              min={0}
              max={1000}
              step={25}
              {...register("bulkDelta", { valueAsNumber: true })}
            />
            <div className="text-xs text-gray-600">{Number(watch("bulkDelta") ?? 0)} kcal/day</div>
            <FieldError name="bulkDelta" />
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Recomp delta (kcal/day)</div>
            <input
              className="w-full"
              type="range"
              min={-500}
              max={250}
              step={25}
              {...register("recompDelta", { valueAsNumber: true })}
            />
            <div className="text-xs text-gray-600">{Number(watch("recompDelta") ?? 0)} kcal/day</div>
            <FieldError name="recompDelta" />
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Bulk protein target (g/lb)</div>
            <input
              className="w-full"
              type="range"
              min={0.7}
              max={1.0}
              step={0.05}
              {...register("bulkProteinGPerLb", { valueAsNumber: true })}
            />
            <div className="text-xs text-gray-600">{Number(watch("bulkProteinGPerLb") ?? 0).toFixed(2)} g/lb</div>
            <FieldError name="bulkProteinGPerLb" />
          </label>
        </div>
      </section>

      <div className="rounded-2xl border p-4 text-sm">
        <div className="font-medium">Form status</div>
        <div className="mt-1 text-gray-600">
          {isValid ? "Valid inputs (calculations will run)" : "Fix errors above to run calculations"}
        </div>
      </div>
    </form>
  );
}
