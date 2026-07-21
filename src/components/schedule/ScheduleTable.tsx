"use client";

import { STATUS_META, STATUS_ORDER, SOURCE_LABEL, type ApptStatus } from "@/lib/appt-meta";
import { agentColor, initials } from "@/lib/agent-visuals";
import type { ScheduleRow } from "@/lib/schedule-query";

export function ScheduleTable({
  rows,
  showAgent,
  onStatusChange,
}: {
  rows: ScheduleRow[];
  showAgent: boolean;
  onStatusChange: (id: string, status: ApptStatus) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-[13.5px]">
        <thead>
          <tr>
            {["Time", "Customer", ...(showAgent ? ["Agent"] : []), "Source", "ID", "Status"].map((h) => (
              <th
                key={h}
                className="border-b border-line px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#9AA1AC]"
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
                  {r.apptTime ? r.apptTime.slice(0, 5) : "—"}
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
                  {SOURCE_LABEL[r.source]}
                </td>
                <td className="border-b border-line px-3 py-3 font-mono text-xs text-[#9AA1AC]">
                  {r.apptCode}
                  {r.rescheduledToCode && (
                    <div
                      className="mt-0.5 whitespace-nowrap"
                      style={{ color: STATUS_META.rescheduled.color }}
                    >
                      ↻ moved to {r.rescheduledToCode}
                    </div>
                  )}
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
                        {STATUS_META[s].label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
