import type { SupabaseClient } from "@supabase/supabase-js";

export type Handler = { id: string; name: string; active: boolean };

// Active handlers sort first so they lead every picker; inactive ones stay
// listed (never deleted) so old appointments keep showing a real name
// instead of silently going blank once someone leaves.
export async function fetchHandlers(supabase: SupabaseClient): Promise<Handler[]> {
  const { data } = await supabase
    .from("handlers")
    .select("id, name, active")
    .order("active", { ascending: false })
    .order("name", { ascending: true });
  return data ?? [];
}
