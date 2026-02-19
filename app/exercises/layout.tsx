import { ReactNode } from "react";
import { requireUser } from "@/lib/supabase/auth";

export default async function ExercisesLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return <>{children}</>;
}
