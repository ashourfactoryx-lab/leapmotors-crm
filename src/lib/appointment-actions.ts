"use server";

import { createClient } from "@/lib/supabase/server";
import type { ApptStatus } from "@/lib/appt-meta";

type Patch = { status: ApptStatus } | { sale_amount: number | null } | { notes: string | null };

// No manual ownership check needed here: the "appt update" RLS policy
// (assigned_agent = auth.uid() OR role in leader/admin) already restricts
// which rows this can touch, using the caller's own session — not a
// service-role client.
export async function updateAppointment(
  id: string,
  patch: Patch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("appointments").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Keeps the original appointment as a frozen historical record
// (status='rescheduled') and creates a new linked appointment for the new
// date/time — see reschedule_appointment() in the DB, which does both as a
// single transaction under the caller's own RLS-scoped session.
export async function rescheduleAppointment(
  oldId: string,
  newDate: string,
  newTime: string | null,
): Promise<{ ok: true; newApptCode: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("reschedule_appointment", { p_old_id: oldId, p_new_date: newDate, p_new_time: newTime })
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, newApptCode: (data as { appt_code: string }).appt_code };
}
