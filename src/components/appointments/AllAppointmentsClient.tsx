"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { STATUS_META, statusLabel } from "@/lib/appt-meta";
import { agentColor, initials } from "@/lib/agent-visuals";
import { fetchAllAppointments, PAGE_SIZE, type AllApptRow } from "@/lib/all-appointments-query";
import type { Handler } from "@/lib/handlers-query";
import { CommentsModal } from "@/components/appointments/CommentsModal";
import { CommentsButton } from "@/components/appointments/CommentsButton";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { dateLocaleTag } from "@/lib/i18n/locale";

function formatDate(iso: string, localeTag: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(localeTag, { day: "2-digit", month: "short" });
}

export function AllAppointmentsClient({
  initialRows,
  initialCount,
  agents,
  handlers,
}: {
  initialRows: AllApptRow[];
  initialCount: number;
  agents: { id: string; full_name: string }[];
  handlers: Handler[];
}) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [agentId, setAgentId] = useState<string>("all");
  const [handlerId, setHandlerId] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(initialRows);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentsTarget, setCommentsTarget] = useState<{ id: string; customerName: string } | null>(null);
  const { t, locale, dir } = useLocale();
  const isFirstRun = useRef(true);

  // Debounce the search box so every keystroke doesn't fire a query.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    fetchAllAppointments(supabase, { search, agentId, handlerId, page })
      .then((result) => {
        if (cancelled) return;
        setRows(result.rows);
        setCount(result.count);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError(t("allAppts.couldntLoad"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, agentId, handlerId, page, t]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] max-w-[340px] flex-1">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth={2}
            className="pointer-events-none absolute left-[11px] top-1/2 h-[15px] w-[15px] -translate-y-1/2 stroke-[#9AA1AC] rtl:left-auto rtl:right-[11px]"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("allAppts.searchPlaceholder")}
            className="w-full rounded-[9px] border border-line bg-card py-2.5 pl-[34px] pr-3 text-[13.5px] focus:border-accent focus:shadow-[0_0_0_3px_rgba(11,209,160,0.15)] focus:outline-none rtl:pl-3 rtl:pr-[34px]"
          />
        </div>

        <select
          value={agentId}
          onChange={(e) => {
            setAgentId(e.target.value);
            setPage(0);
          }}
          className="rounded-[9px] border border-line bg-card px-3 py-2.5 text-[13px] font-medium text-text"
        >
          <option value="all">{t("allAppts.allAgents")}</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name}
            </option>
          ))}
        </select>

        <select
          value={handlerId}
          onChange={(e) => {
            setHandlerId(e.target.value);
            setPage(0);
          }}
          className="rounded-[9px] border border-line bg-card px-3 py-2.5 text-[13px] font-medium text-text"
        >
          <option value="all">{t("allAppts.allHandlers")}</option>
          {handlers.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="font-display text-[15.5px] font-semibold">
            {agentId === "all" ? t("allAppts.everyAppointment") : (agents.find((a) => a.id === agentId)?.full_name ?? "")}
          </h3>
          <span className="text-xs text-muted">
            {loading ? t("common.loading") : t("allAppts.resultsCount", { count })}
          </span>
        </div>

        {error ? (
          <div className="px-5 py-11 text-center text-muted">
            <div className="mx-auto mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#F0524B1A]">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} className="h-[22px] w-[22px] stroke-[#F0524B]">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </svg>
            </div>
            <h4 className="mb-1 font-display text-base font-semibold text-text">{t("allAppts.couldntLoadTitle")}</h4>
            <p className="text-sm">{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-11 text-center text-muted">
            <div className="mx-auto mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} className="h-[22px] w-[22px] stroke-accent-deep">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M3 10h18M8 2v4M16 2v4" />
              </svg>
            </div>
            <h4 className="mb-1 font-display text-base font-semibold text-text">{t("allAppts.noMatches")}</h4>
            <p className="text-sm">{t("allAppts.tryDifferent")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-[13.5px]">
              <thead>
                <tr>
                  {[t("col.id"), t("col.agent"), t("col.customer"), t("col.appt"), t("col.handledBy"), t("col.status"), t("col.comments")].map((h) => (
                    <th
                      key={h}
                      className="border-b border-line px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#9AA1AC]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={loading ? "opacity-50" : ""}>
                {rows.map((r) => {
                  const meta = STATUS_META[r.status];
                  return (
                    <tr key={r.id} className="transition-colors hover:bg-[#F7F8FA]">
                      <td className="border-b border-line px-3 py-3 font-mono text-xs text-[#9AA1AC]">
                        {r.apptCode}
                      </td>
                      <td className="border-b border-line px-3 py-3">
                        <span className="inline-flex items-center gap-2 text-[12.5px] font-medium">
                          <span
                            className="flex h-[22px] w-[22px] items-center justify-center rounded-md font-display text-[10.5px] font-bold text-white"
                            style={{ background: agentColor(r.agentName) }}
                          >
                            {initials(r.agentName)}
                          </span>
                          {r.agentName}
                        </span>
                      </td>
                      <td className="border-b border-line px-3 py-3">
                        <div className="font-medium text-text">{r.customerName}</div>
                        {r.phone && <div className="mt-0.5 font-mono text-[11.5px] text-muted">{r.phone}</div>}
                      </td>
                      <td className="border-b border-line px-3 py-3">
                        <span className="font-mono text-sm font-semibold text-text">
                          {formatDate(r.apptDate, dateLocaleTag(locale))}
                        </span>{" "}
                        <span className="font-mono text-xs text-muted">
                          {r.apptTime ? r.apptTime.slice(0, 5) : ""}
                        </span>
                      </td>
                      <td className="border-b border-line px-3 py-3 text-[12.5px] text-muted">
                        {r.handledByName ?? t("common.dash")}
                      </td>
                      <td className="border-b border-line px-3 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{ background: `${meta.color}1A`, color: meta.color }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
                          {statusLabel(t, r.status)}
                        </span>
                      </td>
                      <td className="border-b border-line px-3 py-3">
                        <CommentsButton
                          onClick={() => setCommentsTarget({ id: r.id, customerName: r.customerName })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {count > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-line px-5 py-3.5">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-[9px] border border-line bg-card px-3.5 py-2 font-display text-[12.5px] font-semibold text-text transition-colors hover:border-[#9AA1AC] disabled:opacity-40"
            >
              {dir === "rtl" ? "→" : "←"} {t("allAppts.previous")}
            </button>
            <span className="font-mono text-xs text-muted">
              {t("allAppts.pageOf", { page: page + 1, total: totalPages })}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-[9px] border border-line bg-card px-3.5 py-2 font-display text-[12.5px] font-semibold text-text transition-colors hover:border-[#9AA1AC] disabled:opacity-40"
            >
              {t("allAppts.next")} {dir === "rtl" ? "←" : "→"}
            </button>
          </div>
        )}
      </div>

      {commentsTarget && (
        <CommentsModal
          apptId={commentsTarget.id}
          customerName={commentsTarget.customerName}
          onClose={() => setCommentsTarget(null)}
        />
      )}
    </div>
  );
}
