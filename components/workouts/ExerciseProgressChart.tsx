"use client";

import { useMemo, useState } from "react";
import { buildHistoryMetric, type ExerciseHistoryItem } from "@/lib/workouts/api";

type Metric = "top_set_e1rm" | "top_set_reps" | "total_volume";

type Props = {
  history: ExerciseHistoryItem[];
  defaultMetric: Metric;
};

const METRIC_LABELS: Record<Metric, string> = {
  top_set_e1rm: "Top-set e1RM",
  top_set_reps: "Top-set reps",
  total_volume: "Total volume",
};

function formatValue(metric: Metric, value: number): string {
  if (metric === "top_set_reps") return String(Math.round(value));
  return value.toFixed(1);
}

export function ExerciseProgressChart({ history, defaultMetric }: Props) {
  const [metric, setMetric] = useState<Metric>(defaultMetric);

  const points = useMemo(() => buildHistoryMetric(history, metric), [history, metric]);

  if (points.length === 0) {
    return (
      <section className="rounded-2xl border p-4">
        <h2 className="text-lg font-semibold">Progression</h2>
        <p className="mt-2 text-sm text-gray-600">No data yet.</p>
      </section>
    );
  }

  const width = 700;
  const height = 240;
  const padding = 32;

  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const spread = maxValue - minValue;
  const yMin = spread === 0 ? minValue - 1 : minValue;
  const yMax = spread === 0 ? maxValue + 1 : maxValue;

  const mapped = points.map((point, index) => {
    const x =
      points.length === 1
        ? width / 2
        : padding + (index / (points.length - 1)) * (width - padding * 2);
    const y = padding + ((yMax - point.value) / (yMax - yMin)) * (height - padding * 2);
    return { ...point, x, y };
  });

  const polyline = mapped.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <section className="space-y-3 rounded-2xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Progression</h2>
        <label className="text-sm">
          <span className="mr-2 text-gray-600">Metric</span>
          <select
            className="rounded-xl border px-3 py-2"
            value={metric}
            onChange={(event) => setMetric(event.target.value as Metric)}
          >
            <option value="top_set_e1rm">Top-set e1RM</option>
            <option value="top_set_reps">Top-set reps</option>
            <option value="total_volume">Total volume</option>
          </select>
        </label>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-60 w-full rounded-xl border bg-white">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#d1d5db" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#d1d5db" />
        <polyline fill="none" stroke="#111827" strokeWidth="2.5" points={polyline} />

        {mapped.map((point) => (
          <g key={`${point.date}-${point.value}`}>
            <circle cx={point.x} cy={point.y} r={4} fill="#111827" />
            <title>
              {point.label}: {formatValue(metric, point.value)}
            </title>
          </g>
        ))}

        {mapped.map((point, index) => (
          <text
            key={`${point.date}-x-label`}
            x={point.x}
            y={height - 10}
            textAnchor={index === 0 ? "start" : index === mapped.length - 1 ? "end" : "middle"}
            fontSize="10"
            fill="#6b7280"
          >
            {point.label}
          </text>
        ))}

        <text x={padding} y={14} fontSize="11" fill="#4b5563">
          {METRIC_LABELS[metric]}
        </text>
      </svg>

      <div className="grid gap-2 text-xs text-gray-600 sm:grid-cols-2 lg:grid-cols-4">
        {mapped.map((point) => (
          <div key={`${point.date}-legend`} className="rounded-xl border px-3 py-2">
            <div>{point.label}</div>
            <div className="font-medium text-gray-800">{formatValue(metric, point.value)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
