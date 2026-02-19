import type { SupabaseClient } from "@supabase/supabase-js";

export type WeightUnit = "lb" | "kg";

export type WorkoutSession = {
  id: string;
  user_id: string;
  started_at: string;
  title: string | null;
  notes: string | null;
  created_at: string | null;
};

export type ExerciseEntry = {
  id: string;
  user_id: string;
  workout_session_id: string;
  name: string;
  equipment_notes: string | null;
  created_at: string | null;
};

export type SetEntry = {
  id: string;
  user_id: string;
  exercise_entry_id: string;
  reps: number;
  rir: number | null;
  load: number | null;
  unit: WeightUnit;
  notes: string | null;
  created_at: string | null;
};

export type SessionListItem = WorkoutSession & {
  exercise_count: number;
};

export type SessionDetail = {
  session: WorkoutSession;
  exercises: Array<
    ExerciseEntry & {
      sets: SetEntry[];
    }
  >;
};

export type ExerciseSummary = {
  name: string;
  last_performed_at: string;
};

export type ExerciseHistoryItem = {
  session_id: string;
  session_started_at: string;
  session_title: string | null;
  exercise_id: string;
  equipment_notes: string | null;
  sets: SetEntry[];
};

export type WorkoutSessionInput = {
  started_at: string;
  title: string;
  notes: string;
  exercises: Array<{
    name: string;
    equipment_notes: string;
    sets: Array<{
      reps: number;
      rir: number | null;
      load: number | null;
      unit: WeightUnit;
      notes: string;
    }>;
  }>;
};

type Client = SupabaseClient;

function normalizeUnit(value: unknown): WeightUnit {
  return value === "kg" ? "kg" : "lb";
}

function toWorkoutSession(row: Record<string, unknown>): WorkoutSession {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    started_at: String(row.started_at),
    title: row.title == null ? null : String(row.title),
    notes: row.notes == null ? null : String(row.notes),
    created_at: row.created_at == null ? null : String(row.created_at),
  };
}

function toExerciseEntry(row: Record<string, unknown>): ExerciseEntry {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    workout_session_id: String(row.workout_session_id),
    name: String(row.name),
    equipment_notes: row.equipment_notes == null ? null : String(row.equipment_notes),
    created_at: row.created_at == null ? null : String(row.created_at),
  };
}

function toSetEntry(row: Record<string, unknown>): SetEntry {
  const reps = Number(row.reps);
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    exercise_entry_id: String(row.exercise_entry_id),
    reps: Number.isFinite(reps) ? reps : 0,
    rir: row.rir == null ? null : Number(row.rir),
    load: row.load == null ? null : Number(row.load),
    unit: normalizeUnit(row.unit),
    notes: row.notes == null ? null : String(row.notes),
    created_at: row.created_at == null ? null : String(row.created_at),
  };
}

function uniqueRecentNames(rows: Array<{ name: string }>, limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const row of rows) {
    const trimmed = row.name.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= limit) break;
  }

  return result;
}

function withSessionDateForExercises(
  sessions: WorkoutSession[],
  exercises: ExerciseEntry[],
): Map<string, string> {
  const sessionById = new Map<string, WorkoutSession>();
  for (const session of sessions) sessionById.set(session.id, session);

  const dateMap = new Map<string, string>();
  for (const exercise of exercises) {
    const session = sessionById.get(exercise.workout_session_id);
    if (session) dateMap.set(exercise.id, session.started_at);
  }
  return dateMap;
}

export async function listWorkoutSessions(client: Client, userId: string): Promise<SessionListItem[]> {
  const { data: sessionsData, error: sessionsError } = await client
    .from("workout_sessions")
    .select("id,user_id,started_at,title,notes,created_at")
    .eq("user_id", userId)
    .order("started_at", { ascending: false });

  if (sessionsError) throw sessionsError;

  const sessions = (sessionsData ?? []).map((row) => toWorkoutSession(row as Record<string, unknown>));
  if (sessions.length === 0) return [];

  const sessionIds = sessions.map((session) => session.id);
  const { data: exercisesData, error: exercisesError } = await client
    .from("exercise_entries")
    .select("id,workout_session_id,user_id,name,equipment_notes,created_at")
    .eq("user_id", userId)
    .in("workout_session_id", sessionIds);

  if (exercisesError) throw exercisesError;

  const counts = new Map<string, number>();
  for (const row of exercisesData ?? []) {
    const workoutSessionId = String((row as Record<string, unknown>).workout_session_id ?? "");
    if (!workoutSessionId) continue;
    counts.set(workoutSessionId, (counts.get(workoutSessionId) ?? 0) + 1);
  }

  return sessions.map((session) => ({
    ...session,
    exercise_count: counts.get(session.id) ?? 0,
  }));
}

export async function createWorkoutSession(
  client: Client,
  userId: string,
  input: WorkoutSessionInput,
): Promise<string> {
  const { data: sessionData, error: sessionError } = await client
    .from("workout_sessions")
    .insert({
      user_id: userId,
      started_at: input.started_at,
      title: input.title.trim() || null,
      notes: input.notes.trim() || null,
    })
    .select("id")
    .single();

  if (sessionError) throw sessionError;

  const sessionId = String((sessionData as Record<string, unknown>).id);

  for (const exerciseInput of input.exercises) {
    const { data: exerciseData, error: exerciseError } = await client
      .from("exercise_entries")
      .insert({
        user_id: userId,
        workout_session_id: sessionId,
        name: exerciseInput.name.trim(),
        equipment_notes: exerciseInput.equipment_notes.trim() || null,
      })
      .select("id")
      .single();

    if (exerciseError) throw exerciseError;

    const exerciseId = String((exerciseData as Record<string, unknown>).id);
    if (exerciseInput.sets.length === 0) continue;

    const rows = exerciseInput.sets.map((set) => ({
      user_id: userId,
      exercise_entry_id: exerciseId,
      reps: set.reps,
      rir: set.rir,
      load: set.load,
      unit: set.unit,
      notes: set.notes.trim() || null,
    }));

    const { error: setsError } = await client.from("set_entries").insert(rows);
    if (setsError) throw setsError;
  }

  return sessionId;
}

export async function getWorkoutSessionDetail(
  client: Client,
  userId: string,
  sessionId: string,
): Promise<SessionDetail | null> {
  const { data: sessionData, error: sessionError } = await client
    .from("workout_sessions")
    .select("id,user_id,started_at,title,notes,created_at")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!sessionData) return null;

  const session = toWorkoutSession(sessionData as Record<string, unknown>);

  const { data: exerciseData, error: exerciseError } = await client
    .from("exercise_entries")
    .select("id,user_id,workout_session_id,name,equipment_notes,created_at")
    .eq("workout_session_id", sessionId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (exerciseError) throw exerciseError;

  const exercises = (exerciseData ?? []).map((row) => toExerciseEntry(row as Record<string, unknown>));
  if (exercises.length === 0) {
    return {
      session,
      exercises: [],
    };
  }

  const exerciseIds = exercises.map((exercise) => exercise.id);
  const { data: setsData, error: setsError } = await client
    .from("set_entries")
    .select("id,user_id,exercise_entry_id,reps,rir,load,unit,notes,created_at")
    .eq("user_id", userId)
    .in("exercise_entry_id", exerciseIds)
    .order("created_at", { ascending: true });

  if (setsError) throw setsError;

  const setsByExercise = new Map<string, SetEntry[]>();
  for (const setRow of setsData ?? []) {
    const set = toSetEntry(setRow as Record<string, unknown>);
    const bucket = setsByExercise.get(set.exercise_entry_id);
    if (bucket) bucket.push(set);
    else setsByExercise.set(set.exercise_entry_id, [set]);
  }

  return {
    session,
    exercises: exercises.map((exercise) => ({
      ...exercise,
      sets: setsByExercise.get(exercise.id) ?? [],
    })),
  };
}

export async function updateWorkoutSession(
  client: Client,
  userId: string,
  sessionId: string,
  input: WorkoutSessionInput,
): Promise<void> {
  const { error: sessionUpdateError } = await client
    .from("workout_sessions")
    .update({
      started_at: input.started_at,
      title: input.title.trim() || null,
      notes: input.notes.trim() || null,
    })
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (sessionUpdateError) throw sessionUpdateError;

  const { data: existingExercisesData, error: existingExercisesError } = await client
    .from("exercise_entries")
    .select("id")
    .eq("workout_session_id", sessionId)
    .eq("user_id", userId);

  if (existingExercisesError) throw existingExercisesError;

  const existingExerciseIds = (existingExercisesData ?? []).map((row) =>
    String((row as Record<string, unknown>).id),
  );

  if (existingExerciseIds.length > 0) {
    const { data: existingSets, error: setsFetchError } = await client
      .from("set_entries")
      .select("id")
      .eq("user_id", userId)
      .in("exercise_entry_id", existingExerciseIds);

    if (setsFetchError) throw setsFetchError;

    const setIds = (existingSets ?? []).map((row) => String((row as Record<string, unknown>).id));
    if (setIds.length > 0) {
      const { error: deleteSetsError } = await client.from("set_entries").delete().in("id", setIds).eq("user_id", userId);
      if (deleteSetsError) throw deleteSetsError;
    }

    const { error: deleteExercisesError } = await client
      .from("exercise_entries")
      .delete()
      .eq("workout_session_id", sessionId)
      .eq("user_id", userId);

    if (deleteExercisesError) throw deleteExercisesError;
  }

  for (const exerciseInput of input.exercises) {
    const { data: exerciseData, error: exerciseError } = await client
      .from("exercise_entries")
      .insert({
        user_id: userId,
        workout_session_id: sessionId,
        name: exerciseInput.name.trim(),
        equipment_notes: exerciseInput.equipment_notes.trim() || null,
      })
      .select("id")
      .single();

    if (exerciseError) throw exerciseError;

    const exerciseId = String((exerciseData as Record<string, unknown>).id);
    if (exerciseInput.sets.length === 0) continue;

    const rows = exerciseInput.sets.map((set) => ({
      user_id: userId,
      exercise_entry_id: exerciseId,
      reps: set.reps,
      rir: set.rir,
      load: set.load,
      unit: set.unit,
      notes: set.notes.trim() || null,
    }));

    const { error: setsError } = await client.from("set_entries").insert(rows);
    if (setsError) throw setsError;
  }
}

export async function deleteWorkoutSession(client: Client, userId: string, sessionId: string): Promise<void> {
  const { error } = await client.from("workout_sessions").delete().eq("id", sessionId).eq("user_id", userId);
  if (error) throw error;
}

export async function listRecentExerciseNames(
  client: Client,
  userId: string,
  query: string,
  limit = 10,
): Promise<string[]> {
  const pattern = query.trim();

  let builder = client
    .from("exercise_entries")
    .select("name")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (pattern.length > 0) {
    builder = builder.ilike("name", `${pattern}%`);
  }

  const { data, error } = await builder;
  if (error) throw error;

  const rows = (data ?? []).map((row) => ({ name: String((row as Record<string, unknown>).name ?? "") }));
  return uniqueRecentNames(rows, limit);
}

export async function listExerciseSummaries(client: Client, userId: string): Promise<ExerciseSummary[]> {
  const { data: exercisesData, error: exercisesError } = await client
    .from("exercise_entries")
    .select("id,name,workout_session_id,user_id,equipment_notes,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (exercisesError) throw exercisesError;

  const exercises = (exercisesData ?? []).map((row) => toExerciseEntry(row as Record<string, unknown>));
  if (exercises.length === 0) return [];

  const sessionIds = Array.from(new Set(exercises.map((exercise) => exercise.workout_session_id)));
  const { data: sessionsData, error: sessionsError } = await client
    .from("workout_sessions")
    .select("id,user_id,started_at,title,notes,created_at")
    .eq("user_id", userId)
    .in("id", sessionIds);

  if (sessionsError) throw sessionsError;

  const sessions = (sessionsData ?? []).map((row) => toWorkoutSession(row as Record<string, unknown>));
  const sessionById = new Map<string, WorkoutSession>();
  for (const session of sessions) sessionById.set(session.id, session);

  const lastByName = new Map<string, string>();
  for (const exercise of exercises) {
    const session = sessionById.get(exercise.workout_session_id);
    if (!session) continue;
    const existing = lastByName.get(exercise.name);
    if (!existing || session.started_at > existing) {
      lastByName.set(exercise.name, session.started_at);
    }
  }

  return Array.from(lastByName.entries())
    .map(([name, last_performed_at]) => ({ name, last_performed_at }))
    .sort((a, b) => (a.last_performed_at < b.last_performed_at ? 1 : -1));
}

export async function getExerciseHistory(
  client: Client,
  userId: string,
  exerciseName: string,
): Promise<ExerciseHistoryItem[]> {
  const { data: exerciseData, error: exerciseError } = await client
    .from("exercise_entries")
    .select("id,user_id,workout_session_id,name,equipment_notes,created_at")
    .eq("user_id", userId)
    .eq("name", exerciseName)
    .order("created_at", { ascending: true });

  if (exerciseError) throw exerciseError;

  const exercises = (exerciseData ?? []).map((row) => toExerciseEntry(row as Record<string, unknown>));
  if (exercises.length === 0) return [];

  const sessionIds = Array.from(new Set(exercises.map((exercise) => exercise.workout_session_id)));
  const { data: sessionsData, error: sessionsError } = await client
    .from("workout_sessions")
    .select("id,user_id,started_at,title,notes,created_at")
    .eq("user_id", userId)
    .in("id", sessionIds);

  if (sessionsError) throw sessionsError;
  const sessions = (sessionsData ?? []).map((row) => toWorkoutSession(row as Record<string, unknown>));
  const sessionById = new Map<string, WorkoutSession>();
  for (const session of sessions) sessionById.set(session.id, session);

  const exerciseIds = exercises.map((exercise) => exercise.id);
  const { data: setsData, error: setsError } = await client
    .from("set_entries")
    .select("id,user_id,exercise_entry_id,reps,rir,load,unit,notes,created_at")
    .eq("user_id", userId)
    .in("exercise_entry_id", exerciseIds)
    .order("created_at", { ascending: true });

  if (setsError) throw setsError;

  const setsByExercise = new Map<string, SetEntry[]>();
  for (const setRow of setsData ?? []) {
    const set = toSetEntry(setRow as Record<string, unknown>);
    const bucket = setsByExercise.get(set.exercise_entry_id);
    if (bucket) bucket.push(set);
    else setsByExercise.set(set.exercise_entry_id, [set]);
  }

  const timeline = exercises
    .map((exercise) => {
      const session = sessionById.get(exercise.workout_session_id);
      if (!session) return null;
      return {
        session_id: session.id,
        session_started_at: session.started_at,
        session_title: session.title,
        exercise_id: exercise.id,
        equipment_notes: exercise.equipment_notes,
        sets: setsByExercise.get(exercise.id) ?? [],
      } satisfies ExerciseHistoryItem;
    })
    .filter((entry): entry is ExerciseHistoryItem => entry !== null)
    .sort((a, b) => (a.session_started_at > b.session_started_at ? 1 : -1));

  return timeline;
}

export function defaultMetricForHistory(history: ExerciseHistoryItem[]): "top_set_e1rm" | "top_set_reps" {
  const hasAnyLoad = history.some((entry) => entry.sets.some((set) => set.load != null && set.load >= 0));
  return hasAnyLoad ? "top_set_e1rm" : "top_set_reps";
}

export type HistoryMetricPoint = {
  label: string;
  date: string;
  value: number;
};

export function buildHistoryMetric(
  history: ExerciseHistoryItem[],
  metric: "top_set_e1rm" | "top_set_reps" | "total_volume",
): HistoryMetricPoint[] {
  return history.map((entry) => {
    const sets = entry.sets;
    let value = 0;

    if (metric === "top_set_e1rm") {
      value = sets.reduce((max, set) => {
        if (set.load == null) return max;
        const e1rm = set.load * (1 + set.reps / 30);
        return e1rm > max ? e1rm : max;
      }, 0);
    } else if (metric === "top_set_reps") {
      value = sets.reduce((max, set) => (set.reps > max ? set.reps : max), 0);
    } else {
      value = sets.reduce((sum, set) => sum + (set.load ?? 0) * set.reps, 0);
    }

    return {
      label: new Date(entry.session_started_at).toLocaleDateString(),
      date: entry.session_started_at,
      value,
    };
  });
}

export function getSessionDatesByExerciseId(
  sessions: WorkoutSession[],
  exercises: ExerciseEntry[],
): Map<string, string> {
  return withSessionDateForExercises(sessions, exercises);
}
