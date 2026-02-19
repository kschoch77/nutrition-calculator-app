import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/workouts");
  }

  return (
    <main className="p-6">
      <div className="mx-auto max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
