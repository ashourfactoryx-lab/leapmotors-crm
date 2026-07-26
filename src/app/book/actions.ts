"use server";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import type { ApptSource } from "@/lib/appt-meta";

export async function bookAppointment(input: {
  customerName: string;
  phone: string;
  source: ApptSource;
  branchId: string | null;
  apptDate: string;
  apptTime: string | null;
  assignedAgent: string;
  notes: string | null;
}): Promise<{ ok: true; apptCode: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  // No manual ownership check here either — the "appt insert" RLS policy
  // (assigned_agent = auth.uid() OR role in leader/admin) is what actually
  // decides whether this assignedAgent is allowed for this caller.
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      customer_name: input.customerName,
      phone: input.phone || null,
      source: input.source,
      branch_id: input.branchId,
      appt_date: input.apptDate,
      appt_time: input.apptTime,
      assigned_agent: input.assignedAgent,
      notes: input.notes || null,
      created_by: session.userId,
    })
    .select("appt_code")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, apptCode: data.appt_code };
}
