import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApptStatus } from "@/lib/appt-meta";
import { singleEmbed } from "@/lib/supabase-embed";

export const ALL_APPTS_SELECT =
  "id, appt_code, appt_date, appt_time, customer_name, phone, status, assigned_agent, handled_by, agent:profiles!assigned_agent(full_name), handlers(name)";

export type AllApptRow = {
  id: string;
  apptCode: string;
  apptDate: string;
  apptTime: string | null;
  customerName: string;
  phone: string | null;
  status: ApptStatus;
  agentId: string;
  agentName: string;
  handledById: string | null;
  handledByName: string | null;
};

type RawAllApptRow = {
  id: string;
  appt_code: string;
  appt_date: string;
  appt_time: string | null;
  customer_name: string;
  phone: string | null;
  status: ApptStatus;
  assigned_agent: string;
  handled_by: string | null;
  agent: unknown;
  handlers: unknown;
};

export function mapAllApptRow(r: RawAllApptRow): AllApptRow {
  const agent = singleEmbed<{ full_name: string }>(r.agent);
  const handler = singleEmbed<{ name: string }>(r.handlers);
  return {
    id: r.id,
    apptCode: r.appt_code,
    apptDate: r.appt_date,
    apptTime: r.appt_time,
    customerName: r.customer_name,
    phone: r.phone,
    status: r.status,
    agentId: r.assigned_agent,
    agentName: agent?.full_name ?? "",
    handledById: r.handled_by,
    handledByName: handler?.name ?? null,
  };
}

export const PAGE_SIZE = 50;

export type AllApptsParams = {
  search: string;
  agentId: string | "all";
  handlerId: string | "all";
  page: number; // 0-indexed
};

export async function fetchAllAppointments(
  supabase: SupabaseClient,
  { search, agentId, handlerId, page }: AllApptsParams,
): Promise<{ rows: AllApptRow[]; count: number }> {
  let query = supabase
    .from("appointments")
    .select(ALL_APPTS_SELECT, { count: "exact" })
    .order("appt_date", { ascending: false })
    .order("appt_time", { ascending: false, nullsFirst: false });

  if (agentId !== "all") query = query.eq("assigned_agent", agentId);
  if (handlerId !== "all") query = query.eq("handled_by", handlerId);

  const trimmed = search.trim();
  if (trimmed) {
    // Commas/parens are structural in PostgREST's or() filter syntax —
    // strip them so a search term can never break the query shape.
    const safe = trimmed.replace(/[,()]/g, "");
    query = query.or(`customer_name.ilike.%${safe}%,phone.ilike.%${safe}%,appt_code.ilike.%${safe}%`);
  }

  const from = page * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  return { rows: (data ?? []).map(mapAllApptRow), count: count ?? 0 };
}
