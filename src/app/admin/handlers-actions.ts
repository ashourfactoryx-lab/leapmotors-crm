"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

// Uses the caller's own RLS-scoped session, not the service-role client —
// handlers are plain rows (no auth.users involved), so the "handlers admin
// write" RLS policy is enough on its own.
export async function createHandler(name: string): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Enter a name." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("handlers").insert({ name: trimmed }).select("id").single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  return { ok: true, data: { id: data.id } };
}

// Deactivating (not deleting) keeps every past appointment's handled_by
// pointing at a real name instead of orphaning it once someone leaves.
export async function setHandlerActive(id: string, active: boolean): Promise<ActionResult<null>> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("handlers").update({ active }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  return { ok: true, data: null };
}
