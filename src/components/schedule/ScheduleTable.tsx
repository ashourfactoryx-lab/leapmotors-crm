"use client";

import { STATUS_META, STATUS_ORDER, statusLabel, sourceLabel, type ApptStatus } from "@/lib/appt-meta";
import { agentColor, initials } from "@/lib/agent-visuals";
import type { ScheduleRow } from "@/lib/schedule-query";
import type { Handler } from "@/lib/handlers-query";
import { CommentsButton } from "@/components/appointments/CommentsButton";
import { useLocale } from "@/components/i18n/LocaleProvider";

export function ScheduleTable({
  rows,
  showAgent,
  handlers,
  onStatusChange,
  onHandledByChange,
  onOpenComments,
}: {
  rows: ScheduleRow[];
  showAgent: boolean;
  handlers: Handler[];
  onStatusChange: (id: string, status: ApptStatus) => void;
  onHandledByChange: (id: string, handledBy: string | null) => void;
  onOpenComments: (id: string, customerName: string) => void;
}) {
  const { t } = useLocale();
  const headers = [
    t("col.time"),
    t("col.customer"),
    ...(showAgent ? [t("col.agent")] : []),
    t("col.source"),
    t("col.id"),
    t("col.handledBy"),
    t("col.status"),
    t("col.comments"),
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-[13.5px]">
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="border-b border-line px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#9AA1AC] rtl:text-right"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const meta = STATUS_META[r.status];
            return (
              <tr key={r.id} className="transition-colors hover:bg-[#F7F8FA]">
                <td className="border-b border-line px-3 py-3 font-mono text-sm font-semibold text-text">
                  {r.apptTime ? r.apptTime.slice(0, 5) : t("common.dash")}
                </td>
                <td className="border-b border-line px-3 py-3">
                  <div className="font-medium text-text">{r.customerName}</div>
                  {r.phone && <div className="mt-0.5 font-mono text-[11.5px] text-muted">{r.phone}</div>}
                </td>
                {showAgent && (
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
                )}
                <td className="border-b border-line px-3 py-3 text-[12.5px] text-muted">
                  {sourceLabel(t, r.source)}
                </td>
                <td className="border-b border-line px-3 py-3 font-mono text-xs text-[#9AA1AC]">
                  {r.apptCode}
                  {r.rescheduledToCode && (
                    <div
                      className="mt-0.5 whitespace-nowrap"
                      style={{ color: STATUS_META.rescheduled.color }}
                    >
                      ↻ {t("schedule.movedTo", { code: r.rescheduledToCode })}
                    </div>
                  )}
                </td>
                <td className="border-b border-line px-3 py-3">
                  <select
                    value={r.handledById ?? ""}
                    onChange={(e) => onHandledByChange(r.id, e.target.value || null)}
                    className="cursor-pointer rounded-lg border border-line bg-card py-1.5 pl-2.5 pr-6 text-[12.5px] font-medium text-text outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(11,209,160,0.15)]"
                  >
                    <option value="">{t("common.dash")}</option>
                    {handlers.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border-b border-line px-3 py-3">
                  <select
                    value={r.status}
                    onChange={(e) => onStatusChange(r.id, e.target.value as ApptStatus)}
                    style={{ color: meta.color }}
                    className="cursor-pointer rounded-lg border border-line bg-card py-1.5 pl-2.5 pr-6 text-[12.5px] font-semibold outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(11,209,160,0.15)]"
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(t, s)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border-b border-line px-3 py-3">
                  <CommentsButton onClick={() => onOpenComments(r.id, r.customerName)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
