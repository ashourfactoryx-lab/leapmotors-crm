import type { SupabaseClient } from "@supabase/supabase-js";
import { STATUS_ORDER, type ApptStatus } from "@/lib/appt-meta";

type AgentStatusRow = { status: ApptStatus; assigned_agent: string };

const HANDLED: ApptStatus[] = ["attended", "closed_sold", "no_show"];
const ATTENDED_LIKE: ApptStatus[] = ["attended", "closed_sold"];

// PostgREST caps an unbounded select at 1000 rows — this project already
// passed that mark, so every full-table read for aggregation must page
// through with .range() rather than assume one request covers it all.
// `range` filters to appt_date in [from, to) when given; omit for all-time.
export async function fetchAllAppointmentAgentStatus(
  supabase: SupabaseClient,
  range?: { from: string; to: string },
): Promise<AgentStatusRow[]> {
  const PAGE = 1000;
  const rows: AgentStatusRow[] = [];
  for (let offset = 0; ; offset += PAGE) {
    let query = supabase.from("appointments").select("status, assigned_agent");
    if (range) query = query.gte("appt_date", range.from).lt("appt_date", range.to);
    const { data, error } = await query.range(offset, offset + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

export type MonthOption = { value: string; label: string };

// "All time" plus one entry per calendar month that actually has data,
// discovered from the real min/max appt_date rather than assumed — so it
// stays correct as new months of bookings are added.
export async function fetchAvailableMonths(supabase: SupabaseClient): Promise<MonthOption[]> {
  const [{ data: minRow }, { data: maxRow }] = await Promise.all([
    supabase.from("appointments").select("appt_date").order("appt_date", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("appointments").select("appt_date").order("appt_date", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!minRow || !maxRow) return [];

  const [minYear, minMonth] = minRow.appt_date.split("-").map(Number);
  const [maxYear, maxMonth] = maxRow.appt_date.split("-").map(Number);

  // Capped at 10 years of months: a bad row with a bogus date (e.g. an
  // unguarded import silently producing the Excel epoch) shouldn't be able
  // to blow this up into a thousand-entry dropdown again.
  const MAX_MONTHS = 120;
  const months: MonthOption[] = [];
  let year = maxYear;
  let month = maxMonth;
  while ((year > minYear || (year === minYear && month >= minMonth)) && months.length < MAX_MONTHS) {
    const value = `${year}-${String(month).padStart(2, "0")}`;
    const label = new Date(`${value}-01T00:00:00`).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
    months.push({ value, label });
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return months;
}

export function monthToRange(value: string): { from: string; to: string } {
  const [year, month] = value.split("-").map(Number);
  const from = `${value}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const to = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { from, to };
}

export type DashboardStats = {
  total: number;
  attended: number;
  noShow: number;
  sold: number;
  attendanceRate: number;
  conversionRate: number;
  leaderboard: { agentId: string; name: string; booked: number }[];
  statusBreakdown: { status: ApptStatus; count: number }[];
};

export function computeDashboardStats(
  rows: AgentStatusRow[],
  profiles: { id: string; full_name: string }[],
): DashboardStats {
  const total = rows.length;
  const attended = rows.filter((r) => ATTENDED_LIKE.includes(r.status)).length;
  const noShow = rows.filter((r) => r.status === "no_show").length;
  const sold = rows.filter((r) => r.status === "closed_sold").length;
  const decided = rows.filter((r) => HANDLED.includes(r.status)).length;

  const attendanceRate = decided ? Math.round((attended / decided) * 100) : 0;
  const conversionRate = attended ? Math.round((sold / attended) * 100) : 0;

  const nameById = new Map(profiles.map((p) => [p.id, p.full_name]));
  const bookedById = new Map<string, number>();
  for (const r of rows) {
    bookedById.set(r.assigned_agent, (bookedById.get(r.assigned_agent) ?? 0) + 1);
  }
  const leaderboard = [...bookedById.entries()]
    .map(([agentId, booked]) => ({ agentId, name: nameById.get(agentId) ?? "Unknown", booked }))
    .sort((a, b) => b.booked - a.booked);

  const statusBreakdown = STATUS_ORDER.map((status) => ({
    status,
    count: rows.filter((r) => r.status === status).length,
  }));

  return { total, attended, noShow, sold, attendanceRate, conversionRate, leaderboard, statusBreakdown };
}
