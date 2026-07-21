import type { ApptSource, ApptStatus } from "@/lib/appt-meta";
import { singleEmbed } from "@/lib/supabase-embed";

// Shared between the server-side initial fetch and the browser client's
// post-reschedule refetch, so both always ask for the same shape.
//
// See schedule-query.ts — the "linked" embed resolves to the *reverse*
// direction for this self-referencing FK: on the original appointment it
// surfaces the new appointment it was rescheduled into.
export const MY_SHEET_SELECT =
  "id, appt_code, appt_date, appt_time, customer_name, phone, source, status, sale_amount, notes, branches(name), linked:appointments!rescheduled_from(appt_code)";

export type MyApptRow = {
  id: string;
  apptCode: string;
  apptDate: string;
  apptTime: string | null;
  customerName: string;
  phone: string | null;
  source: ApptSource;
  branchName: string | null;
  status: ApptStatus;
  saleAmount: number | null;
  notes: string | null;
  rescheduledToCode: string | null;
};

type RawMyApptRow = {
  id: string;
  appt_code: string;
  appt_date: string;
  appt_time: string | null;
  customer_name: string;
  phone: string | null;
  source: ApptSource;
  status: ApptStatus;
  sale_amount: number | null;
  notes: string | null;
  branches: unknown;
  linked: unknown;
};

export function mapMySheetRow(r: RawMyApptRow): MyApptRow {
  const branch = singleEmbed<{ name: string }>(r.branches);
  const linked = singleEmbed<{ appt_code: string }>(r.linked);
  return {
    id: r.id,
    apptCode: r.appt_code,
    apptDate: r.appt_date,
    apptTime: r.appt_time,
    customerName: r.customer_name,
    phone: r.phone,
    source: r.source,
    branchName: branch?.name ?? null,
    status: r.status,
    saleAmount: r.sale_amount,
    notes: r.notes,
    rescheduledToCode: linked?.appt_code ?? null,
  };
}
