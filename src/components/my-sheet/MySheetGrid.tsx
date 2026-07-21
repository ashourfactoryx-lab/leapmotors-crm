"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { updateAppointment, rescheduleAppointment } from "@/lib/appointment-actions";
import { STATUS_META, STATUS_ORDER, SOURCE_LABEL, type ApptStatus } from "@/lib/appt-meta";
import { agentColor, initials } from "@/lib/agent-visuals";
import { MY_SHEET_SELECT, mapMySheetRow, type MyApptRow } from "@/lib/my-sheet-query";
import { RescheduleModal } from "@/components/appointments/RescheduleModal";

const COLUMN_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const FIELD_LABELS = [
  "Appt ID", "Date", "Time", "Customer", "Phone", "Source", "Branch", "Status", "Sale", "Notes",
];

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function formatTime(time: string | null) {
  return time ? time.slice(0, 5) : "";
}

function EditableTextCell({
  value,
  placeholder,
  numeric,
  onCommit,
}: {
  value: string;
  placeholder?: string;
  numeric?: boolean;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  // Resync the draft when the canonical value changes from outside (e.g. a
  // failed save rolling back) — compared during render per React's
  // recommended pattern, not in an effect, since the field is always
  // blurred (not mid-edit) by the time that happens.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(value);
  }

  return (
    <input
      value={draft}
      placeholder={placeholder}
      inputMode={numeric ? "decimal" : undefined}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className="h-[34px] w-full bg-transparent px-2.5 py-1.5 text-[13px] text-text outline-none placeholder:text-[#9AA1AC]"
    />
  );
}

export function MySheetGrid({
  rows: initialRows,
  userName,
  userId,
}: {
  rows: MyApptRow[];
  userName: string;
  userId: string;
}) {
  const [rows, setRows] = useState(initialRows);
  const [toast, setToast] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<MyApptRow | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const stats = useMemo(() => {
    const attended = rows.filter((r) => r.status === "attended" || r.status === "closed_sold").length;
    const sold = rows.filter((r) => r.status === "closed_sold").length;
    const noShow = rows.filter((r) => r.status === "no_show").length;
    return { booked: rows.length, attended, sold, noShow };
  }, [rows]);

  async function commit(
    id: string,
    field: "status" | "saleAmount" | "notes",
    nextValue: ApptStatus | number | null | string,
    patch: { status: ApptStatus } | { sale_amount: number | null } | { notes: string | null },
  ) {
    const previous = rows.find((r) => r.id === id);
    if (!previous) return;

    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: nextValue } : r)));

    const result = await updateAppointment(id, patch);
    if (!result.ok) {
      setRows((prev) => prev.map((r) => (r.id === id ? previous : r)));
      setToast(`Couldn't save — ${result.error}`);
    } else {
      setToast("Saved");
    }
  }

  function commitStatus(id: string, status: ApptStatus) {
    if (status === "rescheduled") {
      const row = rows.find((r) => r.id === id);
      if (row) setRescheduleTarget(row);
      return;
    }
    commit(id, "status", status, { status });
  }

  async function handleRescheduleConfirm(newDate: string, newTime: string | null) {
    if (!rescheduleTarget) return;
    const result = await rescheduleAppointment(rescheduleTarget.id, newDate, newTime);
    setRescheduleTarget(null);
    if (!result.ok) {
      setToast(`Couldn't reschedule — ${result.error}`);
      return;
    }
    setToast(`Rescheduled — new appt ${result.newApptCode}`);
    const supabase = createClient();
    const { data } = await supabase
      .from("appointments")
      .select(MY_SHEET_SELECT)
      .eq("assigned_agent", userId)
      .order("appt_date", { ascending: false })
      .order("appt_time", { ascending: false, nullsFirst: false });
    setRows((data ?? []).map(mapMySheetRow));
  }

  function commitSale(id: string, raw: string) {
    const trimmed = raw.trim();
    if (trimmed === "") {
      commit(id, "saleAmount", null, { sale_amount: null });
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      setToast("Sale must be a number");
      return;
    }
    commit(id, "saleAmount", parsed, { sale_amount: parsed });
  }

  function commitNotes(id: string, raw: string) {
    commit(id, "notes", raw || null, { notes: raw || null });
  }

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3.5 md:grid-cols-4">
        {[
          { label: "Booked", value: stats.booked },
          { label: "Attended", value: stats.attended },
          { label: "Sold", value: stats.sold },
          { label: "No-shows", value: stats.noShow },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-card px-4 py-[15px]">
            <div className="text-[11.5px] font-medium text-muted">{s.label}</div>
            <div className="mt-1.5 font-display text-[23px] font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[10px] border border-[#cfd2d7] bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#e6e7ea] bg-[#fbfbfc] px-3.5 py-2.5">
          <div className="flex items-center gap-2.5 font-display text-[13.5px] font-semibold">
            <span
              className="flex h-[22px] w-[22px] items-center justify-center rounded-md font-display text-[10px] font-bold text-white"
              style={{ background: agentColor(userName) }}
            >
              {initials(userName)}
            </span>
            {userName}
          </div>
          <span className="font-mono text-xs text-muted">{rows.length} rows</span>
          <span className="ml-auto flex items-center gap-2 text-[11.5px] text-[#9AA1AC]">
            Status, sale &amp; notes save as you go
            <Link
              href="/book"
              className="rounded-[9px] bg-ink px-3.5 py-2 font-display text-[13px] font-semibold text-white transition-colors hover:bg-black"
            >
              + New row
            </Link>
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-11 text-center text-muted">
            <div className="mx-auto mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} className="h-[22px] w-[22px] stroke-accent-deep">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M3 10h18M8 2v4M16 2v4" />
              </svg>
            </div>
            <h4 className="mb-1 font-display text-base font-semibold text-text">Your sheet is empty</h4>
            <p className="text-sm">Book an appointment and it appears here as a new row.</p>
          </div>
        ) : (
          <div className="max-h-[65vh] overflow-auto">
            <table className="w-full min-w-[900px] table-fixed border-collapse text-[13px]">
              <colgroup>
                <col className="w-10" />
                <col className="w-[92px]" />
                <col className="w-[74px]" />
                <col className="w-16" />
                <col className="w-[150px]" />
                <col className="w-[118px]" />
                <col className="w-[100px]" />
                <col className="w-[120px]" />
                <col className="w-[140px]" />
                <col className="w-24" />
                <col className="w-[200px]" />
              </colgroup>
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-30 h-5 border border-[#e2e3e6] bg-[#e7eaee]" />
                  {COLUMN_LETTERS.map((l) => (
                    <th
                      key={l}
                      className="sticky top-0 z-20 h-5 border border-[#e2e3e6] bg-[#eef0f3] font-mono text-[10.5px] font-semibold tracking-wide text-[#98a0aa]"
                    >
                      {l}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="sticky left-0 top-5 z-30 h-[34px] border border-[#e2e3e6] bg-[#e7eaee]" />
                  {FIELD_LABELS.map((f) => (
                    <th
                      key={f}
                      className="sticky top-5 z-20 h-[34px] whitespace-nowrap border border-[#e2e3e6] bg-[#f6f7f9] px-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#4a515b]"
                    >
                      {f}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const meta = STATUS_META[r.status];
                  return (
                    <tr key={r.id} className="hover:[&>td.cell]:bg-[#fafbfc]">
                      <td className="sticky left-0 z-10 overflow-hidden border border-[#e2e3e6] bg-[#f4f5f7] text-center font-mono text-[11px] font-medium text-[#98a0aa]">
                        {i + 1}
                      </td>
                      <td className="cell overflow-hidden text-ellipsis whitespace-nowrap border border-[#e2e3e6] bg-card px-2.5 py-1.5 font-mono text-text">
                        {r.apptCode}
                        {r.rescheduledToCode && (
                          <div className="text-[10px]" style={{ color: STATUS_META.rescheduled.color }}>
                            ↻ {r.rescheduledToCode}
                          </div>
                        )}
                      </td>
                      <td className="cell overflow-hidden text-ellipsis whitespace-nowrap border border-[#e2e3e6] bg-card px-2.5 py-1.5 font-mono text-text">
                        {formatDate(r.apptDate)}
                      </td>
                      <td className="cell overflow-hidden text-ellipsis whitespace-nowrap border border-[#e2e3e6] bg-card px-2.5 py-1.5 font-mono text-text">
                        {formatTime(r.apptTime)}
                      </td>
                      <td className="cell overflow-hidden text-ellipsis whitespace-nowrap border border-[#e2e3e6] bg-card px-2.5 py-1.5 text-text">
                        {r.customerName}
                      </td>
                      <td className="cell overflow-hidden text-ellipsis whitespace-nowrap border border-[#e2e3e6] bg-card px-2.5 py-1.5 font-mono text-text">
                        {r.phone}
                      </td>
                      <td className="cell overflow-hidden text-ellipsis whitespace-nowrap border border-[#e2e3e6] bg-card px-2.5 py-1.5 text-text">
                        {SOURCE_LABEL[r.source]}
                      </td>
                      <td className="cell overflow-hidden text-ellipsis whitespace-nowrap border border-[#e2e3e6] bg-card px-2.5 py-1.5 text-text">
                        {r.branchName}
                      </td>
                      <td
                        className="relative overflow-hidden border border-[#e2e3e6] bg-card p-0 focus-within:shadow-[inset_0_0_0_2px_var(--color-accent)]"
                        style={{ borderLeft: `3px solid ${meta.color}` }}
                      >
                        <select
                          value={r.status}
                          onChange={(e) => commitStatus(r.id, e.target.value as ApptStatus)}
                          style={{ color: meta.color }}
                          className="h-[34px] w-full cursor-pointer appearance-none bg-transparent py-1.5 pl-2.5 pr-5 text-[13px] font-semibold outline-none"
                        >
                          {STATUS_ORDER.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_META[s].label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="relative overflow-hidden border border-[#e2e3e6] bg-card p-0 focus-within:shadow-[inset_0_0_0_2px_var(--color-accent)]">
                        <EditableTextCell
                          value={r.saleAmount === null ? "" : String(r.saleAmount)}
                          placeholder="—"
                          numeric
                          onCommit={(v) => commitSale(r.id, v)}
                        />
                      </td>
                      <td className="relative overflow-hidden border border-[#e2e3e6] bg-card p-0 focus-within:shadow-[inset_0_0_0_2px_var(--color-accent)]">
                        <EditableTextCell
                          value={r.notes ?? ""}
                          placeholder="Add a note…"
                          onCommit={(v) => commitNotes(r.id, v)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex h-[38px] items-end gap-[3px] border-t border-[#e0e2e6] bg-[#f2f3f5] px-2.5">
          <div className="mb-[-1px] rounded-t-lg border border-b-0 border-[#e0e2e6] bg-card px-4 py-2 font-display text-[12.5px] font-semibold text-accent-deep">
            {userName}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3.5 text-[11.5px] text-muted">
        {STATUS_ORDER.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className="h-[9px] w-[9px] rounded-sm" style={{ background: STATUS_META[s].color }} />
            {STATUS_META[s].label}
          </span>
        ))}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2.5 rounded-[11px] bg-ink px-5 py-3 text-[13.5px] font-medium text-white shadow-2xl">
          <span className="h-2 w-2 rounded-full bg-accent" />
          {toast}
        </div>
      )}

      {rescheduleTarget && (
        <RescheduleModal
          customerName={rescheduleTarget.customerName}
          currentDate={rescheduleTarget.apptDate}
          currentTime={rescheduleTarget.apptTime}
          onCancel={() => setRescheduleTarget(null)}
          onConfirm={handleRescheduleConfirm}
        />
      )}
    </div>
  );
}
