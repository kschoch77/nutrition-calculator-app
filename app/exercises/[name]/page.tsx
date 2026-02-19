import Link from "next/link";
import { notFound } from "next/navigation";
import { ExerciseProgressChart } from "@/components/workouts/ExerciseProgressChart";
import { requireUser } from "@/lib/supabase/auth";
import { defaultMetricForHistory, getExerciseHistory } from "@/lib/workouts/api";

type Props = {
  params: Promise<{ name: string }>;
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

export default async function ExerciseHistoryPage({ params }: Props) {
  const { name } = await params;
  const exerciseName = decodeURIComponent(name);

  const { supabase, user } = await requireUser();
  const history = await getExerciseHistory(supabase, user.id, exerciseName);

  if (history.length === 0) {
    notFound();
  }

  const defaultMetric = defaultMetricForHistory(history);

  return (
    <main className="p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <Link href="/exercises" className="text-sm text-gray-600 underline">
            Back to exercises
          </Link>
          <h1 className="text-2xl font-semibold">{exerciseName}</h1>
        </div>

        <ExerciseProgressChart history={history} defaultMetric={defaultMetric} />

        <section className="space-y-3 rounded-2xl border p-4">
          <h2 className="text-lg font-semibold">History</h2>

          {history.map((entry) => (
            <article key={entry.exercise_id} className="rounded-xl border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium">{formatDateTime(entry.session_started_at)}</div>
                <Link href={`/workouts/${entry.session_id}`} className="text-sm text-gray-600 underline">
                  Open session
                </Link>
              </div>

              {entry.session_title && <p className="mt-1 text-sm text-gray-600">{entry.session_title}</p>}
              {entry.equipment_notes && <p className="mt-1 text-sm text-gray-600">Equipment: {entry.equipment_notes}</p>}

              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                {entry.sets.map((set, index) => (
                  <li key={set.id}>
                    Set {index + 1}: {set.reps} reps
                    {set.load != null ? ` @ ${set.load} ${set.unit}` : ""}
                    {set.rir != null ? ` (RIR ${set.rir})` : ""}
                    {set.notes ? ` - ${set.notes}` : ""}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
