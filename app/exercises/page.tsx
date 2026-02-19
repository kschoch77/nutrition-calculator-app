import Link from "next/link";
import { requireUser } from "@/lib/supabase/auth";
import { listExerciseSummaries } from "@/lib/workouts/api";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

export default async function ExercisesPage() {
  const { supabase, user } = await requireUser();
  const exercises = await listExerciseSummaries(supabase, user.id);

  return (
    <main className="p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-2xl font-semibold">Exercises</h1>

        {exercises.length === 0 ? (
          <div className="rounded-2xl border p-4 text-sm text-gray-600">
            No exercise history yet. Add a workout session to get started.
          </div>
        ) : (
          <ul className="space-y-3">
            {exercises.map((exercise) => (
              <li key={exercise.name} className="rounded-2xl border p-4">
                <Link href={`/exercises/${encodeURIComponent(exercise.name)}`} className="block">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">{exercise.name}</h2>
                    <span className="text-sm text-gray-600">Last performed {formatDate(exercise.last_performed_at)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
