import type { SupabaseClient } from "@supabase/supabase-js";
import { STATUS_ORDER, type ApptSource, type ApptStatus } from "@/lib/appt-meta";

type ReportRow = {
  status: ApptStatus;
  assigned_agent: string;
  source: ApptSource;
  sale_amount: number | null;
  appt_date: string;
  handled_by: string | null;
  created_at: string;
};

const ATTENDED_LIKE: ApptStatus[] = ["attended", "closed_sold"];
const HANDLED: ApptStatus[] = ["attended", "closed_sold", "no_show"];

// Same 1000-row PostgREST cap applies here as everywhere else this project
// aggregates over the full table — page through with .range().
//
// dateField controls which column the period filter applies to. Every table
// except daily booking activity is naturally about appt_date (appointments
// SCHEDULED in the selected month); daily booking activity is about
// created_at (appointments BOOKED in the selected month) — filtering it by
// appt_date instead would silently mix in bookings made in other months
// whose visit happens to fall in this one, and exclude bookings made this
// month for a visit scheduled elsewhere. Always pass the field matching
// what the caller will group/filter by.
export async function fetchReportRows(
  supabase: SupabaseClient,
  range?: { from: string; to: string },
  agentId?: string,
  dateField: "appt_date" | "created_at" = "appt_date",
): Promise<ReportRow[]> {
  const PAGE = 1000;
  const rows: ReportRow[] = [];
  for (let offset = 0; ; offset += PAGE) {
    let query = supabase
      .from("appointments")
      .select("status, assigned_agent, source, sale_amount, appt_date, handled_by, created_at");
    if (range) query = query.gte(dateField, range.from).lt(dateField, range.to);
    if (agentId) query = query.eq("assigned_agent", agentId);
    const { data, error } = await query.range(offset, offset + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

type Totals = {
  booked: number;
  attended: number;
  noShow: number;
  sold: number;
  sales: number;
  attendanceRate: number;
  conversionRate: number;
};

function computeTotals(rows: ReportRow[]): Totals {
  const booked = rows.length;
  const attended = rows.filter((r) => ATTENDED_LIKE.includes(r.status)).length;
  const noShow = rows.filter((r) => r.status === "no_show").length;
  const soldRows = rows.filter((r) => r.status === "closed_sold");
  const sold = soldRows.length;
  const sales = soldRows.reduce((sum, r) => sum + (r.sale_amount ?? 0), 0);
  const decided = rows.filter((r) => HANDLED.includes(r.status)).length;
  const attendanceRate = decided ? Math.round((attended / decided) * 100) : 0;
  const conversionRate = attended ? Math.round((sold / attended) * 100) : 0;
  return { booked, attended, noShow, sold, sales, attendanceRate, conversionRate };
}

export type AgentPerf = Totals & { agentId: string; name: string };

// profiles is pre-filtered to active accounts, so a removed agent's past
// appointments still count everywhere else but their name drops off this
// table instead of showing as a stray "Unknown" row.
export function computeAgentPerformance(
  rows: ReportRow[],
  profiles: { id: string; full_name: string }[],
): AgentPerf[] {
  const nameById = new Map(profiles.map((p) => [p.id, p.full_name]));
  const byAgent = new Map<string, ReportRow[]>();
  for (const r of rows) {
    const list = byAgent.get(r.assigned_agent) ?? [];
    list.push(r);
    byAgent.set(r.assigned_agent, list);
  }
  return [...byAgent.entries()]
    .filter(([agentId]) => nameById.has(agentId))
    .map(([agentId, list]) => ({ agentId, name: nameById.get(agentId)!, ...computeTotals(list) }))
    .sort((a, b) => b.booked - a.booked);
}

export type HandlerPerf = Totals & { handlerId: string; name: string };

// Rows with no handled_by set are excluded rather than bucketed as
// "Unhandled" — this table is about crediting the showroom staff who did
// handle a visit, not auditing the ones that weren't tagged yet.
export function computeHandlerPerformance(
  rows: ReportRow[],
  handlers: { id: string; name: string }[],
): HandlerPerf[] {
  const nameById = new Map(handlers.map((h) => [h.id, h.name]));
  const byHandler = new Map<string, ReportRow[]>();
  for (const r of rows) {
    if (!r.handled_by) continue;
    const list = byHandler.get(r.handled_by) ?? [];
    list.push(r);
    byHandler.set(r.handled_by, list);
  }
  return [...byHandler.entries()]
    .map(([handlerId, list]) => ({
      handlerId,
      name: nameById.get(handlerId) ?? "Unknown",
      ...computeTotals(list),
    }))
    .sort((a, b) => b.booked - a.booked);
}

export type SourcePerf = Totals & { source: ApptSource };

export function computeSourcePerformance(rows: ReportRow[]): SourcePerf[] {
  const bySource = new Map<ApptSource, ReportRow[]>();
  for (const r of rows) {
    const list = bySource.get(r.source) ?? [];
    list.push(r);
    bySource.set(r.source, list);
  }
  return [...bySource.entries()]
    .map(([source, list]) => ({ source, ...computeTotals(list) }))
    .sort((a, b) => b.booked - a.booked);
}

export type TimeSeriesPoint = Totals & { key: string; label: string };

// Groups by calendar month (YYYY-MM) when no specific month is selected
// ("all time" — one row per month keeps the table readable), or by day
// within that month otherwise.
export function computeTimeSeries(
  rows: ReportRow[],
  granularity: "month" | "day",
  localeTag = "en-GB",
): TimeSeriesPoint[] {
  const byKey = new Map<string, ReportRow[]>();
  for (const r of rows) {
    const key = granularity === "month" ? r.appt_date.slice(0, 7) : r.appt_date;
    const list = byKey.get(key) ?? [];
    list.push(r);
    byKey.set(key, list);
  }
  return [...byKey.entries()]
    .map(([key, list]) => {
      const label =
        granularity === "month"
          ? new Date(`${key}-01T00:00:00`).toLocaleDateString(localeTag, { month: "long", year: "numeric" })
          : new Date(`${key}T00:00:00`).toLocaleDateString(localeTag, {
              weekday: "short",
              day: "numeric",
              month: "short",
            });
      return { key, label, ...computeTotals(list) };
    })
    .sort((a, b) => b.key.localeCompare(a.key));
}

export type DailyBookingActivity = {
  date: string;
  label: string;
  total: number;
  byAgent: {
    agentId: string;
    name: string;
    count: number;
    byStatus: { status: ApptStatus; count: number }[];
  }[];
  byStatus: { status: ApptStatus; count: number }[];
};

function statusBreakdown(rows: ReportRow[]): { status: ApptStatus; count: number }[] {
  return STATUS_ORDER.map((status) => ({
    status,
    count: rows.filter((r) => r.status === status).length,
  })).filter((s) => s.count > 0);
}

// Groups by the date each appointment was actually CREATED (created_at),
// not appt_date (the scheduled visit date) — answers "how many appointments
// did each agent add today, and what became of them", independent of when
// those appointments are scheduled for. profiles is pre-filtered to active
// accounts, same as the other report tables, so a removed agent's past
// activity still counts toward the day's total but drops off the
// per-agent breakdown.
export function computeDailyBookingActivity(
  rows: ReportRow[],
  profiles: { id: string; full_name: string }[],
  localeTag = "en-GB",
): DailyBookingActivity[] {
  const nameById = new Map(profiles.map((p) => [p.id, p.full_name]));
  const byDate = new Map<string, ReportRow[]>();
  for (const r of rows) {
    const date = r.created_at.slice(0, 10);
    const list = byDate.get(date) ?? [];
    list.push(r);
    byDate.set(date, list);
  }
  return [...byDate.entries()]
    .map(([date, list]) => {
      const byAgentRows = new Map<string, ReportRow[]>();
      for (const r of list) {
        const agentList = byAgentRows.get(r.assigned_agent) ?? [];
        agentList.push(r);
        byAgentRows.set(r.assigned_agent, agentList);
      }
      const byAgent = [...byAgentRows.entries()]
        .filter(([agentId]) => nameById.has(agentId))
        .map(([agentId, agentRows]) => ({
          agentId,
          name: nameById.get(agentId)!,
          count: agentRows.length,
          byStatus: statusBreakdown(agentRows),
        }))
        .sort((a, b) => b.count - a.count);
      const label = new Date(`${date}T00:00:00`).toLocaleDateString(localeTag, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      return { date, label, total: list.length, byAgent, byStatus: statusBreakdown(list) };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
