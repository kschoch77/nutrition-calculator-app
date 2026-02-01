"use client";

import { useMemo, useState } from "react";
import { ProfileForm } from "@/components/ProfileForm";
import { ResultsPanel } from "@/components/ResultsPanel";
import type { ProfileInput } from "@/types/nutrition";
import { calculateAll } from "@/lib/calcs";


export default function Home() {
  const [input, setInput] = useState<ProfileInput | null>(null);

  const results = useMemo(() => {
    if (!input) return null;
    try {
      return calculateAll(input);
    } catch {
      return null;
    }
  }, [input]);

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Nutrition Calculator</h1>
          <p className="text-sm text-gray-600">
            Offline-first macro calculator with nerdy BMR/TDEE transparency.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-4">
            <ProfileForm onChange={setInput} />
          </section>

          <section className="rounded-2xl border p-4">
            <h2 className="text-lg font-semibold">Results</h2>

            {!input ? (
              <p className="mt-2 text-sm text-gray-600">
                Enter valid inputs to see results.
              </p>
            ) : !results ? (
              <p className="mt-2 text-sm text-gray-600">
                Calculation engine not implemented yet — next step.
              </p>
            ) : (
              <pre className="mt-3 overflow-auto rounded-xl bg-gray-50 p-3 text-xs">
                {JSON.stringify(results, null, 2)}
              </pre>
            )}

            {input && (
              <div className="mt-4 text-xs text-gray-500">
                Input snapshot:
                <pre className="mt-2 overflow-auto rounded-xl bg-gray-50 p-3">
                  {JSON.stringify(input, null, 2)}
                </pre>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
