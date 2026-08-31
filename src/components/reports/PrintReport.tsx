"use client";

import Image from "next/image";
import { sourceLabel, statusLabel } from "@/lib/appt-meta";
import type { AgentPerf, SourcePerf, HandlerPerf, TimeSeriesPoint, DailyBookingActivity } from "@/lib/reports-query";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { dateLocaleTag } from "@/lib/i18n/locale";

function PrintTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <table className="mb-4 w-full border-collapse">
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th
              key={h}
              className={`border-b border-[#ccc] px-2 py-1.5 text-[10px] uppercase tracking-wide text-[#888] ${
                i === 0 ? "text-left rtl:text-right" : "text-right rtl:text-left"
              }`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td
                key={ci}
                className={`border-b border-[#eee] px-2 py-1.5 text-[12px] ${
                  ci === 0 ? "font-medium" : "text-right font-mono"
                }`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function PrintReport({
  periodLabel,
  agentLabel,
  timeSeries,
  timeSeriesGranularity,
  dailyActivity,
  agentPerformance,
  sourcePerformance,
  handlerPerformance,
}: {
  periodLabel: string;
  agentLabel: string;
  timeSeries: TimeSeriesPoint[];
  timeSeriesGranularity: "month" | "day";
  dailyActivity: DailyBookingActivity[];
  agentPerformance: AgentPerf[];
  sourcePerformance: SourcePerf[];
  handlerPerformance: HandlerPerf[];
}) {
  const { t, locale } = useLocale();
  return (
    <div className="hidden font-sans text-[#111] print:mx-auto print:block print:max-w-[760px]">
      <div className="mb-1 flex items-end justify-between border-b-2 border-[#111] pb-3">
        <Image src="/qonvra-mark-dark.png" alt="Qonvra" width={30} height={30} className="h-[30px] w-auto" />
        <div className="text-right rtl:text-left">
          <div className="font-display text-[17px] font-semibold">{t("reports.performanceReportTitle")}</div>
          <div className="text-[13px] text-[#555]">
            {periodLabel} · {agentLabel}
          </div>
        </div>
      </div>

      <div className="mb-1.5 mt-4 font-display text-[13px] font-semibold">
        {t("reports.apptsBy", {
          granularity: timeSeriesGranularity === "month" ? t("reports.granularityMonth") : t("reports.granularityDay"),
        })}
      </div>
      <PrintTable
        headers={[
          timeSeriesGranularity === "month" ? t("reports.month") : t("reports.day"),
          t("reports.colBooked"),
          t("reports.colAttended"),
          t("reports.colNoShow"),
          t("reports.colSold"),
          t("reports.colSales"),
        ]}
        rows={timeSeries.map((pt) => [pt.label, pt.booked, pt.attended, pt.noShow, pt.sold, pt.sales.toLocaleString()])}
      />

      <div className="mb-1.5 mt-4 font-display text-[13px] font-semibold">{t("reports.dailyBookingActivity")}</div>
      <PrintTable
        headers={[t("reports.day"), t("reports.colBooked"), t("reports.byAgent"), t("reports.byStatus")]}
        rows={dailyActivity.map((d) => [
          d.label,
          d.total,
          d.byAgent.map((a) => `${a.name}: ${a.count}`).join(", "),
          d.byStatus.map((s) => `${statusLabel(t, s.status)}: ${s.count}`).join(", "),
        ])}
      />

      <div className="mb-1.5 mt-4 font-display text-[13px] font-semibold">{t("reports.agentPerformance")}</div>
      <PrintTable
        headers={[
          t("col.agent"),
          t("reports.colBooked"),
          t("reports.colAttended"),
          t("reports.colNoShow"),
          t("reports.colSold"),
          t("reports.colSales"),
          t("reports.colAttendance"),
          t("reports.colConversion"),
        ]}
        rows={agentPerformance.map((a) => [
          a.name,
          a.booked,
          a.attended,
          a.noShow,
          a.sold,
          a.sales.toLocaleString(),
          `${a.attendanceRate}%`,
          `${a.conversionRate}%`,
        ])}
      />

      {handlerPerformance.length > 0 && (
        <>
          <div className="mb-1.5 mt-4 font-display text-[13px] font-semibold">{t("reports.handlerPerformance")}</div>
          <PrintTable
            headers={[
              t("col.handledBy"),
              t("reports.colHandled"),
              t("reports.colAttended"),
              t("reports.colNoShow"),
              t("reports.colSold"),
              t("reports.colSales"),
              t("reports.colAttendance"),
              t("reports.colConversion"),
            ]}
            rows={handlerPerformance.map((h) => [
              h.name,
              h.booked,
              h.attended,
              h.noShow,
              h.sold,
              h.sales.toLocaleString(),
              `${h.attendanceRate}%`,
              `${h.conversionRate}%`,
            ])}
          />
        </>
      )}

      <div className="mb-1.5 mt-4 font-display text-[13px] font-semibold">{t("reports.sourcePerformance")}</div>
      <PrintTable
        headers={[
          t("col.source"),
          t("reports.colBooked"),
          t("reports.colAttended"),
          t("reports.colNoShow"),
          t("reports.colSold"),
          t("reports.colAttendance"),
          t("reports.colConversion"),
        ]}
        rows={sourcePerformance.map((s) => [
          sourceLabel(t, s.source),
          s.booked,
          s.attended,
          s.noShow,
          s.sold,
          `${s.attendanceRate}%`,
          `${s.conversionRate}%`,
        ])}
      />

      <div
        className="mt-4 border-t border-[#eee] pt-2 text-center text-[10.5px] text-[#999]"
        suppressHydrationWarning
      >
        {t("schedule.footer", { time: new Date().toLocaleString(dateLocaleTag(locale)) })}
      </div>
    </div>
  );
}
