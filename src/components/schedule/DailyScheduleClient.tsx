"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateAppointment, rescheduleAppointment } from "@/lib/appointment-actions";
import { STATUS_META, STATUS_ORDER, type ApptStatus } from "@/lib/appt-meta";
import { agentColor, initials } from "@/lib/agent-visuals";
import { SCHEDULE_SELECT, mapScheduleRow, type ScheduleRow } from "@/lib/schedule-query";
import { ScheduleTable } from "./ScheduleTable";
import { PrintSchedule } from "./PrintSchedule";
import { RescheduleModal } from "@/components/appointments/RescheduleModal";

type SortMode = "time" | "agent";
type StatusFilter = "all" | ApptStatus;

// Formats a Date's LOCAL calendar day as YYYY-MM-DD. Never use
// .toISOString() for this: it serializes to UTC, which silently rolls the
// date back (or forward) a day whenever the local offset crosses midnight
// relative to UTC — exactly the bug that made the date-nav arrows jump by
// two days instead of one.
function isoFromLocalDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayISO() {
  return isoFromLocalDate(new Date());
}

function isValidISODate(iso: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(new Date(`${iso}T00:00:00`).getTime());
}

function formatLongDate(iso: string) {
  if (!isValidISODate(iso)) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Defensive fallback to today: a native date input can only produce valid
// values through normal interaction, but this guards against an in-progress
// (not-yet-complete) typed value ever reaching a crash.
function shiftDate(iso: string, days: number) {
  if (!isValidISODate(iso)) return todayISO();
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return isoFromLocalDate(d);
}

const HANDLED: ApptStatus[] = ["attended", "closed_sold", "no_show"];

export function DailyScheduleClient({
  initialDate,
  initialRows,
}: {
  initialDate: string;
  initialRows: ScheduleRow[];
}) {
  const [date, setDate] = useState(initialDate);
  const [sort, setSort] = useState<SortMode>("time");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [rows, setRows] = useState(initialRows);
  const isFirstRun = useRef(true);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function fetchDay() {
      const { data } = await supabase.from("appointments").select(SCHEDULE_SELECT).eq("appt_date", date);
      setRows((data ?? []).map(mapScheduleRow));
    }

    if (isFirstRun.current) {
      isFirstRun.current = false;
    } else {
      fetchDay();
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;

    // @supabase/ssr's cookie-based browser client doesn't automatically wire
    // the signed-in user's JWT into the Realtime socket the way the default
    // localStorage-based client does — without this, the socket connects
    // under the 'anon' role, RLS allows it to see nothing, and
    // postgres_changes events never arrive despite a healthy subscription.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`schedule:${date}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "appointments", filter: `appt_date=eq.${date}` },
          () => fetchDay(),
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [date]);

  const [rescheduleTarget, setRescheduleTarget] = useState<ScheduleRow | null>(null);

  async function commitStatus(id: string, status: ApptStatus) {
    if (status === "rescheduled") {
      const row = rows.find((r) => r.id === id);
      if (row) setRescheduleTarget(row);
      return;
    }
    const previous = rows.find((r) => r.id === id);
    if (!previous) return;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    const result = await updateAppointment(id, { status });
    if (!result.ok) {
      setRows((prev) => prev.map((r) => (r.id === id ? previous : r)));
    }
  }

  async function handleRescheduleConfirm(newDate: string, newTime: string | null) {
    if (!rescheduleTarget) return;
    await rescheduleAppointment(rescheduleTarget.id, newDate, newTime);
    setRescheduleTarget(null);
    const supabase = createClient();
    const { data } = await supabase.from("appointments").select(SCHEDULE_SELECT).eq("appt_date", date);
    setRows((data ?? []).map(mapScheduleRow));
  }

  const filtered = useMemo(
    () => (statusFilter === "all" ? rows : rows.filter((r) => r.status === statusFilter)),
    [rows, statusFilter],
  );
  const handledCount = filtered.filter((r) => HANDLED.includes(r.status)).length;

  const flatRows = useMemo(
    () => filtered.slice().sort((a, b) => (a.apptTime ?? "").localeCompare(b.apptTime ?? "")),
    [filtered],
  );

  const groups = useMemo(() => {
    const map = new Map<string, ScheduleRow[]>();
    for (const r of filtered) {
      const list = map.get(r.agentName) ?? [];
      list.push(r);
      map.set(r.agentName, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([name, list]) =>
          [name, list.slice().sort((a, b) => (a.apptTime ?? "").localeCompare(b.apptTime ?? ""))] as const,
      );
  }, [filtered]);

  const segButtonClass = (active: boolean) =>
    `rounded-md px-3.5 py-1.5 font-display text-[12.5px] font-semibold transition-colors ${
      active ? "bg-card text-text shadow-sm" : "text-muted"
    }`;

  return (
    <div>
      <div className="print:hidden">
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setDate((d) => shiftDate(d, -1))}
            className="rounded-[9px] border border-line bg-card px-3.5 py-2.5 font-display text-sm font-semibold text-text transition-colors hover:border-[#9AA1AC]"
          >
            ←
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              if (isValidISODate(e.target.value)) setDate(e.target.value);
            }}
            className="rounded-[9px] border border-line bg-card px-3 py-2.5 font-mono text-sm"
          />
          <button
            onClick={() => setDate((d) => shiftDate(d, 1))}
            className="rounded-[9px] border border-line bg-card px-3.5 py-2.5 font-display text-sm font-semibold text-text transition-colors hover:border-[#9AA1AC]"
          >
            →
          </button>
          <button
            onClick={() => setDate(todayISO())}
            className="rounded-[9px] border border-line bg-card px-3.5 py-2.5 font-display text-sm font-semibold text-text transition-colors hover:border-[#9AA1AC]"
          >
            Today
          </button>

          <div className="ml-1.5 inline-flex gap-0.5 rounded-[9px] bg-paper p-[3px]">
            <button onClick={() => setSort("time")} className={segButtonClass(sort === "time")}>
              By time
            </button>
            <button onClick={() => setSort("agent")} className={segButtonClass(sort === "agent")}>
              By agent
            </button>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-[9px] border border-line bg-card px-3 py-2.5 text-[13px] font-medium text-text"
          >
            <option value="all">All statuses</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>

          <button
            onClick={() => window.print()}
            className="ml-auto flex items-center gap-2 rounded-[9px] bg-ink px-[15px] py-2.5 font-display text-[13.5px] font-semibold text-white transition-colors hover:bg-black"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} className="h-4 w-4 stroke-current">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <path d="M6 14h12v8H6z" />
            </svg>
            Print schedule
          </button>
        </div>

        <div className="mb-4 text-[13px] text-muted">
          <b className="font-display text-text">{formatLongDate(date)}</b> · {filtered.length} appointment
          {filtered.length !== 1 ? "s" : ""} · {handledCount} handled
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-card px-5 py-11 text-center text-muted">
            <div className="mx-auto mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} className="h-[22px] w-[22px] stroke-accent-deep">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M3 10h18M8 2v4M16 2v4" />
              </svg>
            </div>
            <h4 className="mb-1 font-display text-base font-semibold text-text">Nothing here for this day</h4>
            <p className="text-sm">Try another date or clear the status filter.</p>
          </div>
        ) : sort === "agent" ? (
          <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
            {groups.map(([name, list]) => (
              <div key={name} className="border-b border-line last:border-b-0">
                <div className="flex items-center gap-2.5 px-5 pb-1.5 pt-4 font-display text-[12.5px] font-semibold text-muted">
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-md font-display text-[9.5px] font-bold text-white"
                    style={{ background: agentColor(name) }}
                  >
                    {initials(name)}
                  </span>
                  {name}
                  <span className="font-normal text-[#9AA1AC]">· {list.length}</span>
                </div>
                <ScheduleTable rows={list} showAgent={false} onStatusChange={commitStatus} />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
            <ScheduleTable rows={flatRows} showAgent onStatusChange={commitStatus} />
          </div>
        )}
      </div>

      <PrintSchedule
        date={date}
        statusFilter={statusFilter}
        sort={sort}
        rows={sort === "agent" ? filtered : flatRows}
        groups={sort === "agent" ? groups : null}
      />

      {rescheduleTarget && (
        <RescheduleModal
          customerName={rescheduleTarget.customerName}
          currentDate={date}
          currentTime={rescheduleTarget.apptTime}
          onCancel={() => setRescheduleTarget(null)}
          onConfirm={handleRescheduleConfirm}
        />
      )}
    </div>
  );
}
