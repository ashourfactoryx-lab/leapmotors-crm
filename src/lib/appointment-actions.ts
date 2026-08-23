"use server";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import type { ApptSource, ApptStatus } from "@/lib/appt-meta";
import { MY_SHEET_SELECT, mapMySheetRow, type MyApptRow } from "@/lib/my-sheet-query";

type Patch = Partial<{
  status: ApptStatus;
  sale_amount: number | null;
  notes: string | null;
  customer_name: string;
  phone: string | null;
  appt_date: string;
  appt_time: string | null;
  source: ApptSource;
  branch_id: string | null;
  handled_by: string | null;
}>;

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

// Powers My Sheet's trailing blank rows: always self-assigned, so the "appt
// insert" RLS policy's assigned_agent = auth.uid() branch covers every role
// without needing the leader/admin branch used by the full /book form.
export async function createQuickAppointment(input: {
  customerName: string;
  phone: string | null;
  apptDate: string;
  apptTime: string | null;
  source: ApptSource;
}): Promise<{ ok: true; row: MyApptRow } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      customer_name: input.customerName,
      phone: input.phone,
      appt_date: input.apptDate,
      appt_time: input.apptTime,
      source: input.source,
      assigned_agent: session.userId,
      created_by: session.userId,
    })
    .select(MY_SHEET_SELECT)
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, row: mapMySheetRow(data) };
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
