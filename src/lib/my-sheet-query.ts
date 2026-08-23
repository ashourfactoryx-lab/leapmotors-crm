import type { ApptSource, ApptStatus } from "@/lib/appt-meta";
import { singleEmbed } from "@/lib/supabase-embed";

// Shared between the server-side initial fetch and the browser client's
// post-reschedule refetch, so both always ask for the same shape.
//
// See schedule-query.ts — the "linked" embed resolves to the *reverse*
// direction for this self-referencing FK: on the original appointment it
// surfaces the new appointment it was rescheduled into.
export const MY_SHEET_SELECT =
  "id, appt_code, created_at, appt_date, appt_time, customer_name, phone, source, status, notes, handled_by, handlers(name), linked:appointments!rescheduled_from(appt_code)";

export type MyApptRow = {
  id: string;
  apptCode: string;
  bookedOn: string;
  apptDate: string;
  apptTime: string | null;
  customerName: string;
  phone: string | null;
  source: ApptSource;
  status: ApptStatus;
  notes: string | null;
  handledById: string | null;
  handledByName: string | null;
  rescheduledToCode: string | null;
};

type RawMyApptRow = {
  id: string;
  appt_code: string;
  created_at: string;
  appt_date: string;
  appt_time: string | null;
  customer_name: string;
  phone: string | null;
  source: ApptSource;
  status: ApptStatus;
  notes: string | null;
  handled_by: string | null;
  handlers: unknown;
  linked: unknown;
};

export function mapMySheetRow(r: RawMyApptRow): MyApptRow {
  const handler = singleEmbed<{ name: string }>(r.handlers);
  const linked = singleEmbed<{ appt_code: string }>(r.linked);
  return {
    id: r.id,
    apptCode: r.appt_code,
    bookedOn: r.created_at.slice(0, 10),
    apptDate: r.appt_date,
    apptTime: r.appt_time,
    customerName: r.customer_name,
    phone: r.phone,
    source: r.source,
    status: r.status,
    notes: r.notes,
    handledById: r.handled_by,
    handledByName: handler?.name ?? null,
    rescheduledToCode: linked?.appt_code ?? null,
  };
}
