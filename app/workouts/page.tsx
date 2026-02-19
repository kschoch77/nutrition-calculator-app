import Link from "next/link";
import { requireUser } from "@/lib/supabase/auth";
import { listWorkoutSessions } from "@/lib/workouts/api";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

export default async function WorkoutsPage() {
  const { supabase, user } = await requireUser();
  const sessions = await listWorkoutSessions(supabase, user.id);

  return (
    <main className="p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Workouts</h1>
          <Link href="/workouts/new" className="rounded-xl border px-4 py-2 text-sm font-medium">
            New session
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-2xl border p-4 text-sm text-gray-600">
            No sessions yet. Create your first workout session.
          </div>
        ) : (
          <ul className="space-y-3">
            {sessions.map((session) => (
              <li key={session.id} className="rounded-2xl border p-4">
                <Link href={`/workouts/${session.id}`} className="block space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">{session.title || "Untitled session"}</h2>
                    <span className="text-sm text-gray-600">{session.exercise_count} exercises</span>
                  </div>
                  <div className="text-sm text-gray-600">{formatDateTime(session.started_at)}</div>
                  {session.notes && <p className="text-sm text-gray-700">{session.notes}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
