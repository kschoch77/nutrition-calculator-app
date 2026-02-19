import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/auth";
import { getWorkoutSessionDetail, listRecentExerciseNames } from "@/lib/workouts/api";
import { WorkoutSessionEditor } from "@/components/workouts/WorkoutSessionEditor";

type Props = {
  params: Promise<{ id: string }>;
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

export default async function WorkoutSessionDetailPage({ params }: Props) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const [sessionDetail, recentExerciseNames] = await Promise.all([
    getWorkoutSessionDetail(supabase, user.id, id),
    listRecentExerciseNames(supabase, user.id, "", 10),
  ]);

  if (!sessionDetail) {
    notFound();
  }

  return (
    <main className="p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/workouts" className="text-sm text-gray-600 underline">
          Back to workouts
        </Link>

        <section className="rounded-2xl border p-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">{sessionDetail.session.title || "Untitled session"}</h1>
            <div className="text-sm text-gray-600">{formatDateTime(sessionDetail.session.started_at)}</div>
            {sessionDetail.session.notes && <p className="text-sm text-gray-700">{sessionDetail.session.notes}</p>}
          </div>

          {sessionDetail.exercises.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">No exercises in this session.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {sessionDetail.exercises.map((exercise) => (
                <article key={exercise.id} className="rounded-xl border p-3">
                  <h2 className="font-semibold">{exercise.name}</h2>
                  {exercise.equipment_notes && (
                    <p className="mt-1 text-sm text-gray-600">{exercise.equipment_notes}</p>
                  )}
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    {exercise.sets.map((set, index) => (
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
            </div>
          )}
        </section>

        <WorkoutSessionEditor
          userId={user.id}
          mode="edit"
          sessionDetail={sessionDetail}
          recentExerciseNames={recentExerciseNames}
        />
      </div>
    </main>
  );
}
