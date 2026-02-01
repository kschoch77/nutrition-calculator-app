"use client";

import type { Results, MacroTargets } from "@/lib/calcs";
import { fmtInt, fmtMaybeInt } from "@/lib/format";

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-sm font-medium tabular-nums">{value}</div>
    </div>
  );
}

function MacroCard({
  title,
  data,
}: {
  title: string;
  data: MacroTargets;
}) {
  const proteinCals = data.proteinG * 4;
  const fatCals = data.fatG * 9;
  const carbsCals = data.carbsG * 4;

  // avoid weird % if calories are 0
  const pct = (cals: number) =>
    data.calories > 0 ? Math.round((cals / data.calories) * 100) : 0;

  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{title}</h3>
        <div className="text-sm text-gray-600 tabular-nums">
          {fmtInt(data.calories)} kcal
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-gray-50 p-3">
            <div className="text-xs text-gray-600">Protein</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {fmtInt(data.proteinG)}g
            </div>
            <div className="text-xs text-gray-600 tabular-nums">
              {fmtInt(proteinCals)} kcal - {pct(proteinCals)}%
            </div>
          </div>

          <div className="rounded-xl bg-gray-50 p-3">
            <div className="text-xs text-gray-600">Fat</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {fmtInt(data.fatG)}g
            </div>
            <div className="text-xs text-gray-600 tabular-nums">
              {fmtInt(fatCals)} kcal - {pct(fatCals)}%
            </div>
          </div>

          <div className="rounded-xl bg-gray-50 p-3">
            <div className="text-xs text-gray-600">Carbs</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {fmtInt(data.carbsG)}g
            </div>
            <div className="text-xs text-gray-600 tabular-nums">
              {fmtInt(carbsCals)} kcal - {pct(carbsCals)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResultsPanel({
  results,
}: {
  results: Results;
}) {
  // local UI state inside component is fine for this
  // but we'll keep it simple: controlled by HTML <details> pattern
  return (
    <div className="space-y-6">
      {results.warnings.length > 0 && (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
          <div className="text-sm font-semibold">Warnings</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
            {results.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <details className="group" open>
        <summary className="cursor-pointer list-none">
          <div className="flex items-center justify-between rounded-2xl border p-4 hover:bg-gray-50">
            <div>
              <div className="text-base font-semibold">BMR & TDEE</div>
              <div className="text-xs text-gray-600">
                Click to expand/collapse formulas
              </div>
            </div>
            <div className="text-sm text-gray-600 group-open:hidden">Expand</div>
            <div className="text-sm text-gray-600 hidden group-open:block">Collapse</div>
          </div>
        </summary>

        <div className="mt-3">
          {/* We can't store state in <details> easily; this shows formulas always in expanded mode.
              If you want a separate "show formulas" toggle, we can do that next. */}
          <div className="rounded-2xl border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-xs text-gray-600">Recommended BMR</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">
                  {fmtInt(results.bmr.recommendedBmr)} kcal
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-xs text-gray-600">TDEE</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">
                  {fmtInt(results.tdee)} kcal
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="text-sm font-medium">All BMR formulas</div>
              <div className="space-y-2">
                <StatRow
                  label="Mifflin-St Jeor"
                  value={`${fmtMaybeInt(results.bmr.methods.mifflin)} kcal`}
                />
                <StatRow
                  label="Revised Harris-Benedict"
                  value={`${fmtMaybeInt(results.bmr.methods.revisedHarrisBenedict)} kcal`}
                />
                <StatRow
                  label="Katch-McArdle"
                  value={`${fmtMaybeInt(results.bmr.methods.katchMcArdle)} kcal`}
                />
                <StatRow
                  label="Nelson"
                  value={`${fmtMaybeInt(results.bmr.methods.nelson)} kcal`}
                />
                <StatRow
                  label="Muller"
                  value={`${fmtMaybeInt(results.bmr.methods.muller)} kcal`}
                />
              </div>

              <p className="mt-2 text-xs text-gray-600">
                Nelson/Muller require FM & FFM (from BF% or DEXA).
              </p>
            </div>
          </div>
        </div>
      </details>

      <div className="grid gap-4">
        <MacroCard title="Maintenance" data={results.maintenance} />
        <MacroCard title="Cut" data={results.cut} />
        <MacroCard title="Bulk" data={results.bulk} />
        <MacroCard title="Recomp" data={results.recomp} />
      </div>
    </div>
  );
}
