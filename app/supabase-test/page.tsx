import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <main style={{ padding: 24 }}>
      <h1>Supabase Test</h1>
      <pre>{JSON.stringify({ user: data.user }, null, 2)}</pre>
    </main>
  );
}
