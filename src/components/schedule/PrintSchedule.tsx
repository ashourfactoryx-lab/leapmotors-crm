"use client";

import Image from "next/image";
import { STATUS_META, type ApptStatus } from "@/lib/appt-meta";
import type { ScheduleRow } from "@/lib/schedule-query";

function formatLongDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function PrintTable({ rows }: { rows: ScheduleRow[] }) {
  return (
    <table className="mb-1.5 w-full border-collapse">
      <thead>
        <tr>
          {["Time", "Customer", "Phone", "Agent", "Status"].map((h) => (
            <th key={h} className="border-b border-[#ccc] px-2 py-1.5 text-left text-[10px] uppercase tracking-wide text-[#888]">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="whitespace-nowrap border-b border-[#eee] px-2 py-2 font-mono text-[12.5px] font-semibold">
              {r.apptTime ? r.apptTime.slice(0, 5) : "—"}
            </td>
            <td className="border-b border-[#eee] px-2 py-2 text-[12.5px]">{r.customerName}</td>
            <td className="whitespace-nowrap border-b border-[#eee] px-2 py-2 font-mono text-[12.5px]">{r.phone}</td>
            <td className="border-b border-[#eee] px-2 py-2 text-[12.5px]">{r.agentName}</td>
            <td className="border-b border-[#eee] px-2 py-2 text-[11px] text-[#555]">{STATUS_META[r.status].label}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function PrintSchedule({
  date,
  statusFilter,
  sort,
  rows,
  groups,
}: {
  date: string;
  statusFilter: "all" | ApptStatus;
  sort: "time" | "agent";
  rows: ScheduleRow[];
  groups: readonly (readonly [string, ScheduleRow[]])[] | null;
}) {
  return (
    <div className="hidden font-sans text-[#111] print:mx-auto print:block print:max-w-[720px]">
      <div className="mb-1 flex items-end justify-between border-b-2 border-[#111] pb-3">
        <Image src="/leapmotor-mark-dark.png" alt="LeapMotor" width={30} height={30} className="h-[30px] w-auto" />
        <div className="text-right">
          <div className="font-display text-[17px] font-semibold">Today&apos;s Appointments</div>
          <div className="text-[13px] text-[#555]">{formatLongDate(date)}</div>
        </div>
      </div>

      <div className="mb-3.5 mt-2 font-mono text-xs text-[#666]">
        {rows.length} appointment{rows.length !== 1 ? "s" : ""}
        {statusFilter !== "all" ? ` · ${STATUS_META[statusFilter].label}` : ""} · sorted by {sort}
      </div>

      {rows.length === 0 ? (
        <p className="py-5 text-[13px] text-[#777]">No appointments for this day.</p>
      ) : groups ? (
        groups.map(([name, list]) => (
          <div key={name}>
            <div className="mb-1.5 mt-4 border-l-[3px] border-[#111] pl-2 font-display text-[13px] font-semibold">
              {name} · {list.length}
            </div>
            <PrintTable rows={list} />
          </div>
        ))
      ) : (
        <PrintTable rows={rows} />
      )}

      <div
        className="mt-4.5 border-t border-[#eee] pt-2 text-center text-[10.5px] text-[#999]"
        suppressHydrationWarning
      >
        LeapMotor · Appointment Command Center — generated {new Date().toLocaleString("en-GB")}
      </div>
    </div>
  );
}
