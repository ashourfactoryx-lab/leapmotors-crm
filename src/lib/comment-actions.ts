"use server";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";

// author_id isn't sent here at all — it's a DB column default (auth.uid()),
// backed by the "comments insert" RLS check, so this can't be spoofed by
// passing a different author from the client.
export async function addComment(apptId: string, body: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };

  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Comment can't be empty." };

  const supabase = await createClient();
  const { error } = await supabase.from("appt_comments").insert({ appt_id: apptId, body: trimmed });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
