"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  createWorkoutSession,
  deleteWorkoutSession,
  listRecentExerciseNames,
  updateWorkoutSession,
  type SessionDetail,
  type WeightUnit,
  type WorkoutSessionInput,
} from "@/lib/workouts/api";

type SetDraft = {
  reps: string;
  rir: string;
  load: string;
  unit: WeightUnit;
  notes: string;
};

type ExerciseDraft = {
  name: string;
  equipment_notes: string;
  sets: SetDraft[];
};

type SessionDraft = {
  started_at: string;
  title: string;
  notes: string;
  exercises: ExerciseDraft[];
};

type Props = {
  userId: string;
  mode: "create" | "edit";
  sessionDetail?: SessionDetail;
  recentExerciseNames: string[];
};

function toLocalDatetimeValue(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function nowLocalDatetimeValue(): string {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function emptySet(): SetDraft {
  return {
    reps: "",
    rir: "",
    load: "",
    unit: "lb",
    notes: "",
  };
}

function emptyExercise(): ExerciseDraft {
  return {
    name: "",
    equipment_notes: "",
    sets: [emptySet()],
  };
}

function buildInitialDraft(detail?: SessionDetail): SessionDraft {
  if (!detail) {
    return {
      started_at: nowLocalDatetimeValue(),
      title: "",
      notes: "",
      exercises: [emptyExercise()],
    };
  }

  return {
    started_at: toLocalDatetimeValue(detail.session.started_at),
    title: detail.session.title ?? "",
    notes: detail.session.notes ?? "",
    exercises: detail.exercises.map((exercise) => ({
      name: exercise.name,
      equipment_notes: exercise.equipment_notes ?? "",
      sets:
        exercise.sets.length > 0
          ? exercise.sets.map((set) => ({
              reps: String(set.reps),
              rir: set.rir == null ? "" : String(set.rir),
              load: set.load == null ? "" : String(set.load),
              unit: set.unit,
              notes: set.notes ?? "",
            }))
          : [emptySet()],
    })),
  };
}

function toIsoString(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseReps(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.floor(parsed);
}

function toPayload(draft: SessionDraft): WorkoutSessionInput {
  return {
    started_at: toIsoString(draft.started_at),
    title: draft.title.trim(),
    notes: draft.notes.trim(),
    exercises: draft.exercises
      .map((exercise) => ({
        name: exercise.name.trim(),
        equipment_notes: exercise.equipment_notes.trim(),
        sets: exercise.sets
          .map((set) => ({
            reps: parseReps(set.reps),
            rir: parseOptionalNumber(set.rir),
            load: parseOptionalNumber(set.load),
            unit: set.unit,
            notes: set.notes.trim(),
          }))
          .filter((set) => set.reps > 0)
          .map((set) => ({
            ...set,
            rir: set.rir != null ? Math.max(0, Math.min(10, set.rir)) : null,
            load: set.load != null ? Math.max(0, set.load) : null,
          })),
      }))
      .filter((exercise) => exercise.name.length > 0),
  };
}

function isPayloadValid(payload: WorkoutSessionInput): string | null {
  if (!payload.started_at) return "Started at is required.";
  if (payload.exercises.length === 0) return "Add at least one exercise.";

  for (const exercise of payload.exercises) {
    if (!exercise.name.trim()) return "Each exercise needs a name.";
    if (exercise.sets.length === 0) return `Exercise "${exercise.name}" needs at least one set.`;
    for (const set of exercise.sets) {
      if (!Number.isFinite(set.reps) || set.reps <= 0) {
        return `Exercise "${exercise.name}" has a set with invalid reps.`;
      }
      if (set.rir != null && (set.rir < 0 || set.rir > 10)) {
        return `Exercise "${exercise.name}" has RIR outside 0-10.`;
      }
      if (set.load != null && set.load < 0) {
        return `Exercise "${exercise.name}" has load below 0.`;
      }
    }
  }

  return null;
}

export function WorkoutSessionEditor({ userId, mode, sessionDetail, recentExerciseNames }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [draft, setDraft] = useState<SessionDraft>(() => buildInitialDraft(sessionDetail));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(recentExerciseNames.slice(0, 10));

  const sessionId = sessionDetail?.session.id ?? null;
  const datalistId = "recent-exercise-options";

  const canDelete = mode === "edit" && !!sessionId;
  const saveLabel = mode === "create" ? "Create session" : "Save changes";

  const inputPreview = useMemo(() => toPayload(draft), [draft]);

  async function refreshSuggestions(query: string) {
    try {
      const names = await listRecentExerciseNames(supabase, userId, query, 10);
      setSuggestions(names);
    } catch {
      setSuggestions(recentExerciseNames.slice(0, 10));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = toPayload(draft);
    const validationError = isPayloadValid(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      if (mode === "create") {
        const newId = await createWorkoutSession(supabase, userId, payload);
        router.push(`/workouts/${newId}`);
      } else if (sessionId) {
        await updateWorkoutSession(supabase, userId, sessionId, payload);
        router.refresh();
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Could not save session. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!sessionId) return;
    const confirmed = window.confirm("Delete this workout session?");
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      await deleteWorkoutSession(supabase, userId, sessionId);
      router.push("/workouts");
      router.refresh();
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : "Could not delete session. Please try again.";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border p-4">
        <h1 className="text-2xl font-semibold">{mode === "create" ? "New Workout Session" : "Edit Workout Session"}</h1>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium">Started at</span>
            <input
              type="datetime-local"
              value={draft.started_at}
              onChange={(event) => {
                const started_at = event.target.value;
                setDraft((current) => ({ ...current, started_at }));
              }}
              className="w-full rounded-xl border px-3 py-2"
              required
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">Title</span>
            <input
              type="text"
              value={draft.title}
              onChange={(event) => {
                const title = event.target.value;
                setDraft((current) => ({ ...current, title }));
              }}
              className="w-full rounded-xl border px-3 py-2"
              placeholder="Upper body strength"
            />
          </label>

          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm font-medium">Notes</span>
            <textarea
              value={draft.notes}
              onChange={(event) => {
                const notes = event.target.value;
                setDraft((current) => ({ ...current, notes }));
              }}
              className="min-h-24 w-full rounded-xl border px-3 py-2"
              placeholder="General session notes"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Exercises</h2>
          <button
            type="button"
            onClick={() => {
              setDraft((current) => ({
                ...current,
                exercises: [...current.exercises, emptyExercise()],
              }));
            }}
            className="rounded-xl border px-3 py-2 text-sm font-medium"
          >
            Add exercise
          </button>
        </div>

        <datalist id={datalistId}>
          {suggestions.map((name) => (
            <option value={name} key={name} />
          ))}
        </datalist>

        {draft.exercises.map((exercise, exerciseIndex) => (
          <article key={`exercise-${exerciseIndex}`} className="rounded-2xl border p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium">Exercise name</span>
                  <input
                    type="text"
                    value={exercise.name}
                    onChange={async (event) => {
                      const name = event.target.value;
                      setDraft((current) => {
                        const exercises = [...current.exercises];
                        exercises[exerciseIndex] = { ...exercises[exerciseIndex], name };
                        return { ...current, exercises };
                      });
                      await refreshSuggestions(name);
                    }}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder="Bench press"
                    list={datalistId}
                    required
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium">Equipment notes</span>
                  <input
                    type="text"
                    value={exercise.equipment_notes}
                    onChange={(event) => {
                      const equipment_notes = event.target.value;
                      setDraft((current) => {
                        const exercises = [...current.exercises];
                        exercises[exerciseIndex] = { ...exercises[exerciseIndex], equipment_notes };
                        return { ...current, exercises };
                      });
                    }}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder="Incline bench + dumbbells"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDraft((current) => {
                    if (current.exercises.length <= 1) {
                      return current;
                    }
                    return {
                      ...current,
                      exercises: current.exercises.filter((_, index) => index !== exerciseIndex),
                    };
                  });
                }}
                className="rounded-xl border px-3 py-2 text-sm"
              >
                Remove
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Sets</h3>
                <button
                  type="button"
                  onClick={() => {
                    setDraft((current) => {
                      const exercises = [...current.exercises];
                      const target = exercises[exerciseIndex];
                      exercises[exerciseIndex] = {
                        ...target,
                        sets: [...target.sets, emptySet()],
                      };
                      return { ...current, exercises };
                    });
                  }}
                  className="rounded-xl border px-3 py-2 text-sm"
                >
                  Add set
                </button>
              </div>

              {exercise.sets.map((set, setIndex) => (
                <div
                  key={`set-${exerciseIndex}-${setIndex}`}
                  className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_2fr_auto]"
                >
                  <label className="space-y-1">
                    <span className="text-xs font-medium">Reps*</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={set.reps}
                      onChange={(event) => {
                        const reps = event.target.value;
                        setDraft((current) => {
                          const exercises = [...current.exercises];
                          const sets = [...exercises[exerciseIndex].sets];
                          sets[setIndex] = { ...sets[setIndex], reps };
                          exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };
                          return { ...current, exercises };
                        });
                      }}
                      className="w-full rounded-xl border px-2 py-2"
                      required
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-medium">RIR</span>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={1}
                      value={set.rir}
                      onChange={(event) => {
                        const rir = event.target.value;
                        setDraft((current) => {
                          const exercises = [...current.exercises];
                          const sets = [...exercises[exerciseIndex].sets];
                          sets[setIndex] = { ...sets[setIndex], rir };
                          exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };
                          return { ...current, exercises };
                        });
                      }}
                      className="w-full rounded-xl border px-2 py-2"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-medium">Load</span>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={set.load}
                      onChange={(event) => {
                        const load = event.target.value;
                        setDraft((current) => {
                          const exercises = [...current.exercises];
                          const sets = [...exercises[exerciseIndex].sets];
                          sets[setIndex] = { ...sets[setIndex], load };
                          exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };
                          return { ...current, exercises };
                        });
                      }}
                      className="w-full rounded-xl border px-2 py-2"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-medium">Unit</span>
                    <select
                      value={set.unit}
                      onChange={(event) => {
                        const unit = event.target.value as WeightUnit;
                        setDraft((current) => {
                          const exercises = [...current.exercises];
                          const sets = [...exercises[exerciseIndex].sets];
                          sets[setIndex] = { ...sets[setIndex], unit };
                          exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };
                          return { ...current, exercises };
                        });
                      }}
                      className="w-full rounded-xl border px-2 py-2"
                    >
                      <option value="lb">lb</option>
                      <option value="kg">kg</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-medium">Notes</span>
                    <input
                      type="text"
                      value={set.notes}
                      onChange={(event) => {
                        const notes = event.target.value;
                        setDraft((current) => {
                          const exercises = [...current.exercises];
                          const sets = [...exercises[exerciseIndex].sets];
                          sets[setIndex] = { ...sets[setIndex], notes };
                          exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };
                          return { ...current, exercises };
                        });
                      }}
                      className="w-full rounded-xl border px-2 py-2"
                      placeholder="Tempo, pause, etc."
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setDraft((current) => {
                        const exercises = [...current.exercises];
                        const target = exercises[exerciseIndex];
                        if (target.sets.length <= 1) return current;

                        exercises[exerciseIndex] = {
                          ...target,
                          sets: target.sets.filter((_, index) => index !== setIndex),
                        };
                        return { ...current, exercises };
                      });
                    }}
                    className="self-end rounded-xl border px-3 py-2 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border p-4 text-sm text-gray-600">
        <div className="font-medium text-gray-800">Live preview</div>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-gray-50 p-3 text-xs">
          {JSON.stringify(inputPreview, null, 2)}
        </pre>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl border px-4 py-2 text-sm font-medium"
        >
          {loading ? "Saving..." : saveLabel}
        </button>

        {canDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="rounded-xl border px-4 py-2 text-sm font-medium text-red-600"
          >
            Delete session
          </button>
        )}
      </div>
    </form>
  );
}
