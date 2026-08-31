"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { updateAppointment, rescheduleAppointment, createQuickAppointment, deleteAppointment } from "@/lib/appointment-actions";
import { STATUS_META, STATUS_ORDER, statusLabel, sourceLabel, type ApptSource, type ApptStatus } from "@/lib/appt-meta";
import { agentColor, initials } from "@/lib/agent-visuals";
import { MY_SHEET_SELECT, mapMySheetRow, type MyApptRow } from "@/lib/my-sheet-query";
import { RescheduleModal } from "@/components/appointments/RescheduleModal";
import { CommentsModal } from "@/components/appointments/CommentsModal";
import { CommentsButton } from "@/components/appointments/CommentsButton";
import { DeleteConfirmModal } from "@/components/appointments/DeleteConfirmModal";
import { todayISO } from "@/lib/local-date";
import type { Handler } from "@/lib/handlers-query";
import type { Role } from "@/lib/nav-items";
import { useLocale } from "@/components/i18n/LocaleProvider";

const COLUMN_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];
const BLANK_ROW_COUNT = 10;

function makeDraftKey() {
  return `draft-${Math.random().toString(36).slice(2)}`;
}

const cellClass =
  "cell overflow-hidden text-ellipsis whitespace-nowrap border border-[#e2e3e6] bg-card px-2.5 py-1.5 text-text";
const editableCellClass =
  "relative overflow-hidden border border-[#e2e3e6] bg-card p-0 focus-within:shadow-[inset_0_0_0_2px_var(--color-accent)]";
const inputClass =
  "h-[34px] w-full bg-transparent px-2.5 py-1.5 text-[13px] text-text outline-none placeholder:text-[#9AA1AC]";
const selectClass =
  "h-[34px] w-full cursor-pointer appearance-none bg-transparent px-2.5 py-1.5 text-[13px] text-text outline-none";

function EditableTextCell({
  value,
  placeholder,
  type = "text",
  numeric,
  mono,
  onCommit,
}: {
  value: string;
  placeholder?: string;
  type?: "text" | "date" | "time";
  numeric?: boolean;
  mono?: boolean;
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
      type={type}
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
      className={mono ? `${inputClass} font-mono` : inputClass}
    />
  );
}

type DraftFields = {
  customerName: string;
  phone: string;
  apptDate: string;
  apptTime: string;
  source: ApptSource;
};

function DraftRow({
  rowNumber,
  onCreate,
}: {
  rowNumber: number;
  onCreate: (fields: DraftFields) => Promise<boolean>;
}) {
  const [fields, setFields] = useState<DraftFields>({
    customerName: "",
    phone: "",
    apptDate: todayISO(),
    apptTime: "",
    source: "phone_call",
  });
  const [submitting, setSubmitting] = useState(false);
  const { t } = useLocale();

  function set<K extends keyof DraftFields>(key: K, value: DraftFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function submitIfReady() {
    const name = fields.customerName.trim();
    if (!name || submitting) return;
    setSubmitting(true);
    const ok = await onCreate({ ...fields, customerName: name });
    if (!ok) setSubmitting(false);
    // On success this row is replaced by a real row from the parent, so no
    // need to reset local state here.
  }

  // Fires once focus actually leaves the row (tabbing/clicking between this
  // row's own cells re-focuses a descendant, which relatedTarget catches) —
  // not on every per-cell blur, so filling Name then Phone then Source
  // doesn't submit a half-typed row after the first field.
  function handleRowBlur(e: React.FocusEvent<HTMLTableRowElement>) {
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    submitIfReady();
  }

  return (
    <tr className="hover:[&>td.cell]:bg-[#fafbfc]" onBlur={handleRowBlur}>
      <td className="sticky left-0 z-10 overflow-hidden border border-[#e2e3e6] bg-[#f4f5f7] text-center font-mono text-[11px] font-medium text-[#98a0aa] rtl:left-auto rtl:right-0">
        {rowNumber}
      </td>
      <td className={cellClass + " font-mono text-[#c4c8ce]"}>{t("common.dash")}</td>
      <td className={cellClass + " font-mono text-[#c4c8ce]"}>{t("common.dash")}</td>
      <td className={editableCellClass}>
        <input
          value={fields.customerName}
          placeholder={t("mySheet.typeAName")}
          disabled={submitting}
          onChange={(e) => set("customerName", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className={inputClass}
        />
      </td>
      <td className={editableCellClass}>
        <input
          value={fields.phone}
          placeholder="05X-XXX-XXXX"
          disabled={submitting}
          onChange={(e) => set("phone", e.target.value)}
          className={`${inputClass} font-mono`}
        />
      </td>
      <td className={editableCellClass}>
        <select
          value={fields.source}
          disabled={submitting}
          onChange={(e) => set("source", e.target.value as ApptSource)}
          className={selectClass}
        >
          {(["phone_call", "whatsapp", "other"] as ApptSource[]).map((s) => (
            <option key={s} value={s}>
              {sourceLabel(t, s)}
            </option>
          ))}
        </select>
      </td>
      <td className={editableCellClass}>
        <input
          type="date"
          value={fields.apptDate}
          disabled={submitting}
          onChange={(e) => set("apptDate", e.target.value)}
          className={`${inputClass} font-mono`}
        />
      </td>
      <td className={editableCellClass}>
        <input
          type="time"
          value={fields.apptTime}
          disabled={submitting}
          onChange={(e) => set("apptTime", e.target.value)}
          className={`${inputClass} font-mono`}
        />
      </td>
      <td className={cellClass + " text-[#c4c8ce]"}>{submitting ? t("common.adding") : t("common.dash")}</td>
      <td className={cellClass + " text-[#c4c8ce]"}>{t("common.dash")}</td>
      <td className={cellClass + " text-[#c4c8ce]"}>{t("common.dash")}</td>
      <td className={cellClass + " text-[#c4c8ce]"}>{t("common.dash")}</td>
    </tr>
  );
}

export function MySheetGrid({
  rows: initialRows,
  handlers,
  userName,
  userId,
  role,
}: {
  rows: MyApptRow[];
  handlers: Handler[];
  userName: string;
  userId: string;
  role: Role;
}) {
  const { t, dir } = useLocale();
  const canDelete = role === "admin" || role === "team_leader";
  const [rows, setRows] = useState(initialRows);
  const [drafts, setDrafts] = useState(() => Array.from({ length: BLANK_ROW_COUNT }, () => makeDraftKey()));
  const [toast, setToast] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<MyApptRow | null>(null);
  const [commentsTarget, setCommentsTarget] = useState<{ id: string; customerName: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; customerName: string } | null>(null);
  // Rows always come back from the server in appt-number order and stay put
  // there when edited in place — a new/edited row never jumps around the
  // sheet. Re-sorting by date is opt-in only, applied for display without
  // touching the underlying order.
  const [sortMode, setSortMode] = useState<"code" | "date">("code");

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  const stats = useMemo(() => {
    const attended = rows.filter((r) => r.status === "attended" || r.status === "closed_sold").length;
    const sold = rows.filter((r) => r.status === "closed_sold").length;
    const noShow = rows.filter((r) => r.status === "no_show").length;
    return { booked: rows.length, attended, sold, noShow };
  }, [rows]);

  const displayRows = useMemo(() => {
    if (sortMode === "code") return rows;
    return [...rows].sort((a, b) => {
      const dateCmp = b.apptDate.localeCompare(a.apptDate);
      if (dateCmp !== 0) return dateCmp;
      return (b.apptTime ?? "").localeCompare(a.apptTime ?? "");
    });
  }, [rows, sortMode]);

  async function refetchRows() {
    const supabase = createClient();
    const { data } = await supabase
      .from("appointments")
      .select(MY_SHEET_SELECT)
      .eq("assigned_agent", userId)
      .order("appt_code", { ascending: true });
    setRows((data ?? []).map(mapMySheetRow));
  }

  async function commit(id: string, patch: Parameters<typeof updateAppointment>[1], optimistic: Partial<MyApptRow>) {
    const previous = rows.find((r) => r.id === id);
    if (!previous) return;

    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...optimistic } : r)));

    const result = await updateAppointment(id, patch);
    if (!result.ok) {
      setRows((prev) => prev.map((r) => (r.id === id ? previous : r)));
      setToast(t("common.couldntSave", { error: result.error }));
    } else {
      setToast(t("common.saved"));
    }
  }

  function commitStatus(id: string, status: ApptStatus) {
    if (status === "rescheduled") {
      const row = rows.find((r) => r.id === id);
      if (row) setRescheduleTarget(row);
      return;
    }
    commit(id, { status }, { status });
  }

  async function handleRescheduleConfirm(newDate: string, newTime: string | null) {
    if (!rescheduleTarget) return;
    const result = await rescheduleAppointment(rescheduleTarget.id, newDate, newTime);
    setRescheduleTarget(null);
    if (!result.ok) {
      setToast(t("mySheet.couldntReschedule", { error: result.error }));
      return;
    }
    setToast(t("mySheet.rescheduled", { code: result.newApptCode }));
    await refetchRows();
  }

  function commitNotes(id: string, raw: string) {
    commit(id, { notes: raw || null }, { notes: raw || null });
  }

  function commitCustomerName(id: string, raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setToast(t("mySheet.nameEmpty"));
      return;
    }
    commit(id, { customer_name: trimmed }, { customerName: trimmed });
  }

  function commitPhone(id: string, raw: string) {
    commit(id, { phone: raw || null }, { phone: raw || null });
  }

  function commitDate(id: string, raw: string) {
    if (!raw) return;
    commit(id, { appt_date: raw }, { apptDate: raw });
  }

  function commitTime(id: string, raw: string) {
    commit(id, { appt_time: raw || null }, { apptTime: raw || null });
  }

  function commitSource(id: string, source: ApptSource) {
    commit(id, { source }, { source });
  }

  function commitHandledBy(id: string, handledBy: string) {
    const handledByName = handlers.find((h) => h.id === handledBy)?.name ?? null;
    commit(id, { handled_by: handledBy || null }, { handledById: handledBy || null, handledByName });
  }

  async function handleCreateDraft(key: string, fields: DraftFields): Promise<boolean> {
    const result = await createQuickAppointment({
      customerName: fields.customerName,
      phone: fields.phone.trim() || null,
      apptDate: fields.apptDate || todayISO(),
      apptTime: fields.apptTime || null,
      source: fields.source,
    });
    if (!result.ok) {
      setToast(t("mySheet.couldntAddRow", { error: result.error }));
      return false;
    }
    setToast(t("mySheet.added", { code: result.row.apptCode }));
    await refetchRows();
    setDrafts((prev) => [...prev.filter((k) => k !== key), makeDraftKey()]);
    return true;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 grid flex-shrink-0 grid-cols-2 gap-2.5 md:grid-cols-4">
        {[
          { label: t("mySheet.booked"), value: stats.booked },
          { label: t("mySheet.attended"), value: stats.attended },
          { label: t("mySheet.sold"), value: stats.sold },
          { label: t("mySheet.noShows"), value: stats.noShow },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-baseline gap-2 rounded-lg border border-line bg-card px-3 py-2"
          >
            <span className="font-display text-[17px] font-semibold">{s.value}</span>
            <span className="text-[11px] font-medium text-muted">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-[#cfd2d7] bg-card shadow-card">
        <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-[#e6e7ea] bg-[#fbfbfc] px-3.5 py-2.5">
          <div className="flex items-center gap-2.5 font-display text-[13.5px] font-semibold">
            <span
              className="flex h-[22px] w-[22px] items-center justify-center rounded-md font-display text-[10px] font-bold text-white"
              style={{ background: agentColor(userName) }}
            >
              {initials(userName)}
            </span>
            {userName}
          </div>
          <span className="font-mono text-xs text-muted">{t("mySheet.rowsCount", { count: rows.length })}</span>
          <label className="flex items-center gap-1.5 text-[11.5px] text-[#9AA1AC]">
            {t("mySheet.sort")}
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as "code" | "date")}
              className="rounded-[7px] border border-line bg-card px-2 py-1 text-[12px] font-medium text-text"
            >
              <option value="code">{t("mySheet.sortByCode")}</option>
              <option value="date">{t("mySheet.sortByDate")}</option>
            </select>
          </label>
          <span className="ms-auto flex items-center gap-2 text-[11.5px] text-[#9AA1AC]">
            {t("mySheet.typeToAdd")}
            <Link
              href="/book"
              className="rounded-[9px] border border-line px-3.5 py-2 font-display text-[13px] font-semibold text-text transition-colors hover:border-[#9AA1AC]"
            >
              {t("mySheet.fullForm")}
            </Link>
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[1600px] table-fixed border-collapse text-[13px]">
            <colgroup>
              <col className="w-10" />
              <col className="w-[100px]" />
              <col className="w-[110px]" />
              <col className="w-[220px]" />
              <col className="w-[140px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[90px]" />
              <col className="w-[150px]" />
              <col className="w-[140px]" />
              <col className="w-[260px]" />
              <col className="w-[110px]" />
            </colgroup>
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-30 h-5 border border-[#e2e3e6] bg-[#e7eaee] rtl:left-auto rtl:right-0" />
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
                <th className="sticky left-0 top-5 z-30 h-[34px] border border-[#e2e3e6] bg-[#e7eaee] rtl:left-auto rtl:right-0" />
                {[
                  t("col.apptId"),
                  t("col.bookedOn"),
                  t("col.customer"),
                  t("col.phone"),
                  t("col.source"),
                  t("col.date"),
                  t("col.time"),
                  t("col.status"),
                  t("col.handledBy"),
                  t("col.notes"),
                  t("col.comments"),
                ].map((f) => (
                  <th
                    key={f}
                    className="sticky top-5 z-20 h-[34px] whitespace-nowrap border border-[#e2e3e6] bg-[#f6f7f9] px-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#4a515b] rtl:text-right"
                  >
                    {f}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((r, i) => {
                const meta = STATUS_META[r.status];
                return (
                  <tr key={r.id} className="group hover:[&>td.cell]:bg-[#fafbfc]">
                    <td className="sticky left-0 z-10 overflow-hidden border border-[#e2e3e6] bg-[#f4f5f7] text-center font-mono text-[11px] font-medium text-[#98a0aa] rtl:left-auto rtl:right-0">
                      {canDelete ? (
                        <>
                          <span className="group-hover:hidden">{i + 1}</span>
                          <button
                            onClick={() => setDeleteTarget({ id: r.id, customerName: r.customerName })}
                            title={t("deleteConfirm.button")}
                            className="hidden h-full w-full items-center justify-center text-[#F0524B] group-hover:flex"
                          >
                            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} className="h-3.5 w-3.5 stroke-current">
                              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        i + 1
                      )}
                    </td>
                    <td className={cellClass + " font-mono"}>
                      {r.apptCode}
                      {r.rescheduledToCode && (
                        <div className="text-[10px]" style={{ color: STATUS_META.rescheduled.color }}>
                          ↻ {r.rescheduledToCode}
                        </div>
                      )}
                    </td>
                    <td className={cellClass + " font-mono text-muted"}>{r.bookedOn}</td>
                    <td className={editableCellClass}>
                      <EditableTextCell value={r.customerName} onCommit={(v) => commitCustomerName(r.id, v)} />
                    </td>
                    <td className={editableCellClass}>
                      <EditableTextCell
                        mono
                        value={r.phone ?? ""}
                        placeholder={t("common.dash")}
                        onCommit={(v) => commitPhone(r.id, v)}
                      />
                    </td>
                    <td className={editableCellClass}>
                      <select
                        value={r.source}
                        onChange={(e) => commitSource(r.id, e.target.value as ApptSource)}
                        className={selectClass}
                      >
                        {(["phone_call", "whatsapp", "other"] as ApptSource[]).map((s) => (
                          <option key={s} value={s}>
                            {sourceLabel(t, s)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={editableCellClass}>
                      <EditableTextCell type="date" mono value={r.apptDate} onCommit={(v) => commitDate(r.id, v)} />
                    </td>
                    <td className={editableCellClass}>
                      <EditableTextCell
                        type="time"
                        mono
                        value={r.apptTime ?? ""}
                        onCommit={(v) => commitTime(r.id, v)}
                      />
                    </td>
                    <td
                      className="relative overflow-hidden border border-[#e2e3e6] bg-card p-0 focus-within:shadow-[inset_0_0_0_2px_var(--color-accent)]"
                      style={
                        dir === "rtl"
                          ? { borderRight: `3px solid ${meta.color}` }
                          : { borderLeft: `3px solid ${meta.color}` }
                      }
                    >
                      <select
                        value={r.status}
                        onChange={(e) => commitStatus(r.id, e.target.value as ApptStatus)}
                        style={{ color: meta.color }}
                        className="h-[34px] w-full cursor-pointer appearance-none bg-transparent py-1.5 pl-2.5 pr-5 text-[13px] font-semibold outline-none"
                      >
                        {STATUS_ORDER.map((s) => (
                          <option key={s} value={s}>
                            {statusLabel(t, s)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={editableCellClass}>
                      <select
                        value={r.handledById ?? ""}
                        onChange={(e) => commitHandledBy(r.id, e.target.value)}
                        className={selectClass}
                      >
                        <option value="">{t("common.dash")}</option>
                        {handlers.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={editableCellClass}>
                      <EditableTextCell
                        value={r.notes ?? ""}
                        placeholder={t("mySheet.addNote")}
                        onCommit={(v) => commitNotes(r.id, v)}
                      />
                    </td>
                    <td className={cellClass}>
                      <CommentsButton
                        onClick={() => setCommentsTarget({ id: r.id, customerName: r.customerName })}
                      />
                    </td>
                  </tr>
                );
              })}
              {drafts.map((key, i) => (
                <DraftRow key={key} rowNumber={rows.length + i + 1} onCreate={(f) => handleCreateDraft(key, f)} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex h-[38px] flex-shrink-0 items-end gap-[3px] border-t border-[#e0e2e6] bg-[#f2f3f5] px-2.5">
          <div className="mb-[-1px] rounded-t-lg border border-b-0 border-[#e0e2e6] bg-card px-4 py-2 font-display text-[12.5px] font-semibold text-accent-deep">
            {userName}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-shrink-0 flex-wrap gap-3.5 text-[11.5px] text-muted">
        {STATUS_ORDER.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className="h-[9px] w-[9px] rounded-sm" style={{ background: STATUS_META[s].color }} />
            {statusLabel(t, s)}
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

      {commentsTarget && (
        <CommentsModal
          apptId={commentsTarget.id}
          customerName={commentsTarget.customerName}
          onClose={() => setCommentsTarget(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          customerName={deleteTarget.customerName}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            const result = await deleteAppointment(deleteTarget.id);
            if (result.ok) {
              setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
            }
            return result;
          }}
        />
      )}
    </div>
  );
}
