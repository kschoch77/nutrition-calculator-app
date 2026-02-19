import Link from "next/link";
import { requireUser } from "@/lib/supabase/auth";
import { listRecentExerciseNames } from "@/lib/workouts/api";
import { WorkoutSessionEditor } from "@/components/workouts/WorkoutSessionEditor";

export default async function NewWorkoutSessionPage() {
  const { supabase, user } = await requireUser();
  const recentExerciseNames = await listRecentExerciseNames(supabase, user.id, "", 10);

  return (
    <main className="p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <Link href="/workouts" className="text-sm text-gray-600 underline">
          Back to workouts
        </Link>

        <WorkoutSessionEditor
          userId={user.id}
          mode="create"
          recentExerciseNames={recentExerciseNames}
        />
      </div>
    </main>
  );
}
