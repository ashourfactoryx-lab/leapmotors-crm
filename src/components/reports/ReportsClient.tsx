"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { agentColor, initials } from "@/lib/agent-visuals";
import { sourceLabel } from "@/lib/appt-meta";
import { monthToRange, type MonthOption } from "@/lib/dashboard-query";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { dateLocaleTag } from "@/lib/i18n/locale";
import {
  fetchReportRows,
  computeAgentPerformance,
  computeSourcePerformance,
  computeHandlerPerformance,
  computeTimeSeries,
  type AgentPerf,
  type SourcePerf,
  type HandlerPerf,
  type TimeSeriesPoint,
} from "@/lib/reports-query";
import type { Handler } from "@/lib/handlers-query";
import { PrintReport } from "./PrintReport";

function Panel({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h3 className="font-display text-[15.5px] font-semibold">{title}</h3>
        <span className="text-xs text-muted">{hint}</span>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`border-b border-line px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#9AA1AC] ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children, right, bold }: { children: React.ReactNode; right?: boolean; bold?: boolean }) {
  return (
    <td
      className={`border-b border-line px-3 py-2.5 font-mono text-[13px] ${right ? "text-right" : "text-left"} ${
        bold ? "font-semibold" : ""
      }`}
    >
      {children}
    </td>
  );
}

export function ReportsClient({
  initialAgentPerformance,
  initialSourcePerformance,
  initialHandlerPerformance,
  initialTimeSeries,
  monthOptions,
  agents,
  handlers,
}: {
  initialAgentPerformance: AgentPerf[];
  initialSourcePerformance: SourcePerf[];
  initialHandlerPerformance: HandlerPerf[];
  initialTimeSeries: TimeSeriesPoint[];
  monthOptions: MonthOption[];
  agents: { id: string; full_name: string }[];
  handlers: Handler[];
}) {
  const { t, locale } = useLocale();
  const [period, setPeriod] = useState<"all" | string>("all");
  const [agentId, setAgentId] = useState<"all" | string>("all");
  const [agentPerformance, setAgentPerformance] = useState(initialAgentPerformance);
  const [sourcePerformance, setSourcePerformance] = useState(initialSourcePerformance);
  const [handlerPerformance, setHandlerPerformance] = useState(initialHandlerPerformance);
  const [timeSeries, setTimeSeries] = useState(initialTimeSeries);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    const range = period === "all" ? undefined : monthToRange(period);

    async function refresh() {
      setLoading(true);
      try {
        const rows = await fetchReportRows(supabase, range, agentId === "all" ? undefined : agentId);
        const { data: profiles } = await supabase.from("profiles").select("id, full_name");
        if (cancelled) return;
        setAgentPerformance(computeAgentPerformance(rows, profiles ?? []));
        setSourcePerformance(computeSourcePerformance(rows));
        setHandlerPerformance(computeHandlerPerformance(rows, handlers));
        setTimeSeries(computeTimeSeries(rows, period === "all" ? "month" : "day", dateLocaleTag(locale)));
        setError(null);
      } catch {
        if (!cancelled) setError(t("reports.couldntLoad"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    refresh();
    return () => {
      cancelled = true;
    };
  }, [period, agentId, handlers, t, locale]);

  const periodLabel =
    period === "all" ? t("dashboard.allTime") : (monthOptions.find((m) => m.value === period)?.label ?? period);
  const agentLabel =
    agentId === "all"
      ? t("allAppts.allAgents")
      : (agents.find((a) => a.id === agentId)?.full_name ?? t("reports.unknownAgent"));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3 print:hidden">
        <label className="text-[13px] font-medium text-muted" htmlFor="reports-period">
          {t("dashboard.period")}
        </label>
        <select
          id="reports-period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-[9px] border border-line bg-card px-3 py-2 text-[13px] font-medium text-text"
        >
          <option value="all">{t("dashboard.allTime")}</option>
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <label className="text-[13px] font-medium text-muted" htmlFor="reports-agent">
          {t("col.agent")}
        </label>
        <select
          id="reports-agent"
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className="rounded-[9px] border border-line bg-card px-3 py-2 text-[13px] font-medium text-text"
        >
          <option value="all">{t("allAppts.allAgents")}</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name}
            </option>
          ))}
        </select>

        {loading && <span className="text-[12.5px] text-muted">{t("common.loading")}</span>}
        {error && <span className="text-[12.5px] font-medium text-[#F0524B]">{error}</span>}

        <button
          onClick={() => window.print()}
          className="ms-auto flex items-center gap-2 rounded-[9px] bg-ink px-[15px] py-2.5 font-display text-[13.5px] font-semibold text-white transition-all duration-150 hover:-translate-y-px hover:bg-black hover:shadow-md active:translate-y-0 active:shadow-none"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} className="h-4 w-4 stroke-current">
            <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <path d="M6 14h12v8H6z" />
          </svg>
          {t("reports.printPdf")}
        </button>
      </div>

      <div className={`flex flex-col gap-5 print:hidden transition-opacity ${loading ? "opacity-50" : ""}`}>
        <Panel
          title={period === "all" ? t("reports.apptsByMonth") : t("reports.apptsByDay")}
          hint={period === "all" ? t("reports.monthsCount", { count: timeSeries.length }) : t("reports.daysCount", { count: timeSeries.length })}
        >
          {timeSeries.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">{t("reports.noApptsInPeriod")}</p>
          ) : (
            <table className="w-full min-w-[560px] border-collapse text-[13.5px]">
              <thead>
                <tr>
                  <Th>{period === "all" ? t("reports.month") : t("reports.day")}</Th>
                  <Th right>{t("reports.colBooked")}</Th>
                  <Th right>{t("reports.colAttended")}</Th>
                  <Th right>{t("reports.colNoShow")}</Th>
                  <Th right>{t("reports.colSold")}</Th>
                  <Th right>{t("reports.colSales")}</Th>
                </tr>
              </thead>
              <tbody>
                {timeSeries.map((pt) => (
                  <tr key={pt.key} className="hover:bg-[#F7F8FA]">
                    <td className="border-b border-line px-3 py-2.5 text-[13px] font-medium text-text">
                      {pt.label}
                    </td>
                    <Td right bold>
                      {pt.booked}
                    </Td>
                    <Td right>{pt.attended}</Td>
                    <Td right>{pt.noShow}</Td>
                    <Td right>{pt.sold}</Td>
                    <Td right>{pt.sales.toLocaleString()}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title={t("reports.agentPerformance")} hint={t("dashboard.agentsCount", { count: agentPerformance.length })}>
          {agentPerformance.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">{t("reports.noApptsInPeriod")}</p>
          ) : (
            <table className="w-full min-w-[720px] border-collapse text-[13.5px]">
              <thead>
                <tr>
                  <Th>{t("col.agent")}</Th>
                  <Th right>{t("reports.colBooked")}</Th>
                  <Th right>{t("reports.colAttended")}</Th>
                  <Th right>{t("reports.colNoShow")}</Th>
                  <Th right>{t("reports.colSold")}</Th>
                  <Th right>{t("reports.colSales")}</Th>
                  <Th right>{t("reports.colAttendance")}</Th>
                  <Th right>{t("reports.colConversion")}</Th>
                </tr>
              </thead>
              <tbody>
                {agentPerformance.map((a) => (
                  <tr key={a.agentId} className="hover:bg-[#F7F8FA]">
                    <td className="border-b border-line px-3 py-2.5">
                      <span className="inline-flex items-center gap-2 text-[13px] font-medium">
                        <span
                          className="flex h-[22px] w-[22px] items-center justify-center rounded-md font-display text-[10.5px] font-bold text-white"
                          style={{ background: agentColor(a.name) }}
                        >
                          {initials(a.name)}
                        </span>
                        {a.name}
                      </span>
                    </td>
                    <Td right bold>
                      {a.booked}
                    </Td>
                    <Td right>{a.attended}</Td>
                    <Td right>{a.noShow}</Td>
                    <Td right>{a.sold}</Td>
                    <Td right>{a.sales.toLocaleString()}</Td>
                    <Td right>{a.attendanceRate}%</Td>
                    <Td right>{a.conversionRate}%</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title={t("reports.handlerPerformance")} hint={t("reports.handlersCount", { count: handlerPerformance.length })}>
          {handlerPerformance.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">{t("reports.noHandledVisits")}</p>
          ) : (
            <table className="w-full min-w-[720px] border-collapse text-[13.5px]">
              <thead>
                <tr>
                  <Th>{t("col.handledBy")}</Th>
                  <Th right>{t("reports.colHandled")}</Th>
                  <Th right>{t("reports.colAttended")}</Th>
                  <Th right>{t("reports.colNoShow")}</Th>
                  <Th right>{t("reports.colSold")}</Th>
                  <Th right>{t("reports.colSales")}</Th>
                  <Th right>{t("reports.colAttendance")}</Th>
                  <Th right>{t("reports.colConversion")}</Th>
                </tr>
              </thead>
              <tbody>
                {handlerPerformance.map((h) => (
                  <tr key={h.handlerId} className="hover:bg-[#F7F8FA]">
                    <td className="border-b border-line px-3 py-2.5 text-[13px] font-medium text-text">{h.name}</td>
                    <Td right bold>
                      {h.booked}
                    </Td>
                    <Td right>{h.attended}</Td>
                    <Td right>{h.noShow}</Td>
                    <Td right>{h.sold}</Td>
                    <Td right>{h.sales.toLocaleString()}</Td>
                    <Td right>{h.attendanceRate}%</Td>
                    <Td right>{h.conversionRate}%</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title={t("reports.sourcePerformance")} hint={t("reports.sourcesCount", { count: sourcePerformance.length })}>
          {sourcePerformance.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">{t("reports.noApptsInPeriod")}</p>
          ) : (
            <table className="w-full min-w-[640px] border-collapse text-[13.5px]">
              <thead>
                <tr>
                  <Th>{t("col.source")}</Th>
                  <Th right>{t("reports.colBooked")}</Th>
                  <Th right>{t("reports.colAttended")}</Th>
                  <Th right>{t("reports.colNoShow")}</Th>
                  <Th right>{t("reports.colSold")}</Th>
                  <Th right>{t("reports.colAttendance")}</Th>
                  <Th right>{t("reports.colConversion")}</Th>
                </tr>
              </thead>
              <tbody>
                {sourcePerformance.map((s) => (
                  <tr key={s.source} className="hover:bg-[#F7F8FA]">
                    <td className="border-b border-line px-3 py-2.5 text-[13px] font-medium text-text">
                      {sourceLabel(t, s.source)}
                    </td>
                    <Td right bold>
                      {s.booked}
                    </Td>
                    <Td right>{s.attended}</Td>
                    <Td right>{s.noShow}</Td>
                    <Td right>{s.sold}</Td>
                    <Td right>{s.attendanceRate}%</Td>
                    <Td right>{s.conversionRate}%</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <PrintReport
        periodLabel={periodLabel}
        agentLabel={agentLabel}
        timeSeries={timeSeries}
        timeSeriesGranularity={period === "all" ? "month" : "day"}
        agentPerformance={agentPerformance}
        sourcePerformance={sourcePerformance}
        handlerPerformance={handlerPerformance}
      />
    </div>
  );
}
