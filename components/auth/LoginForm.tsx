"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (mode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push("/workouts");
      router.refresh();
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/workouts");
      router.refresh();
      setLoading(false);
      return;
    }

    setMessage("Check your email for a confirmation link, then sign in.");
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Login</h1>
        <p className="text-sm text-gray-600">Use email and password to sign in or create an account.</p>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="w-full rounded-xl border px-3 py-2"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={6}
          className="w-full rounded-xl border px-3 py-2"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          onClick={() => setMode("signin")}
          disabled={loading}
          className="rounded-xl border px-4 py-2 text-sm font-medium"
        >
          {loading && mode === "signin" ? "Signing in..." : "Sign in"}
        </button>
        <button
          type="submit"
          onClick={() => setMode("signup")}
          disabled={loading}
          className="rounded-xl border px-4 py-2 text-sm font-medium"
        >
          {loading && mode === "signup" ? "Signing up..." : "Sign up"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-gray-700">{message}</p>}
    </form>
  );
}
