import type { ApptSource, ApptStatus } from "@/lib/appt-meta";
import { singleEmbed } from "@/lib/supabase-embed";

// Shared between the server-side initial fetch and the browser client's
// date-change / Realtime refetches, so both always ask for the same shape.
//
// The "linked" embed resolves to the *reverse* direction for this
// self-referencing FK (PostgREST can't disambiguate a self-join's direction
// from the hint alone): for a given row it returns the OTHER row whose
// rescheduled_from points at this one — i.e. on the original appointment,
// it surfaces the new appointment it was rescheduled into, not the other
// way around.
export const SCHEDULE_SELECT =
  "id, appt_code, appt_time, customer_name, phone, source, status, assigned_agent, handled_by, agent:profiles!assigned_agent(full_name), handler:handlers(name), linked:appointments!rescheduled_from(appt_code)";

export type ScheduleRow = {
  id: string;
  apptCode: string;
  apptTime: string | null;
  customerName: string;
  phone: string | null;
  source: ApptSource;
  status: ApptStatus;
  agentId: string;
  agentName: string;
  handledById: string | null;
  handledByName: string | null;
  rescheduledToCode: string | null;
};

type RawScheduleRow = {
  id: string;
  appt_code: string;
  appt_time: string | null;
  customer_name: string;
  phone: string | null;
  source: ApptSource;
  status: ApptStatus;
  assigned_agent: string;
  handled_by: string | null;
  agent: unknown;
  handler: unknown;
  linked: unknown;
};

export function mapScheduleRow(r: RawScheduleRow): ScheduleRow {
  const agent = singleEmbed<{ full_name: string }>(r.agent);
  const handler = singleEmbed<{ name: string }>(r.handler);
  const linked = singleEmbed<{ appt_code: string }>(r.linked);
  return {
    id: r.id,
    apptCode: r.appt_code,
    apptTime: r.appt_time,
    customerName: r.customer_name,
    phone: r.phone,
    source: r.source,
    status: r.status,
    agentId: r.assigned_agent,
    agentName: agent?.full_name ?? "",
    handledById: r.handled_by,
    handledByName: handler?.name ?? null,
    rescheduledToCode: linked?.appt_code ?? null,
  };
}
