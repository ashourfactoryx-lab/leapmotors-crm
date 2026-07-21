"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";

export function RescheduleModal({
  customerName,
  currentDate,
  currentTime,
  onCancel,
  onConfirm,
}: {
  customerName: string;
  currentDate: string;
  currentTime: string | null;
  onCancel: () => void;
  onConfirm: (newDate: string, newTime: string | null) => Promise<void>;
}) {
  const [date, setDate] = useState(currentDate);
  const [time, setTime] = useState(currentTime ? currentTime.slice(0, 5) : "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError("");
    if (!date) {
      setError("Pick a new date.");
      return;
    }
    startTransition(async () => {
      await onConfirm(date, time || null);
    });
  }

  const inputClass =
    "mb-3.5 w-full rounded-[9px] border border-line px-3.5 py-3 text-sm focus:border-accent focus:shadow-[0_0_0_3px_rgba(11,209,160,0.15)] focus:outline-none";

  return (
    <Modal onClose={onCancel}>
      <div className="px-[22px] pt-5">
        <h3 className="mb-1 font-display text-lg font-semibold">Reschedule {customerName}</h3>
        <p className="text-[13px] leading-relaxed text-muted">
          Pick the new date and time. This appointment is kept as a record and marked Rescheduled;
          a new appointment is created for the new slot.
        </p>
      </div>
      <div className="px-[22px] py-[18px]">
        <label className="mb-1.5 block text-xs font-medium text-muted">New date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />

        <label className="mb-1.5 block text-xs font-medium text-muted">New time (optional)</label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className={`${inputClass} mb-0`}
        />

        <div className="mt-2.5 min-h-[16px] text-[12.5px] font-medium text-[#F0524B]">{error}</div>
      </div>
      <div className="flex justify-end gap-2.5 px-[22px] pb-5">
        <button
          onClick={onCancel}
          className="rounded-[9px] border border-line bg-card px-4 py-2.5 font-display text-[13.5px] font-semibold text-text transition-colors hover:border-[#9AA1AC]"
        >
          Cancel
        </button>
        <button
          onClick={confirm}
          disabled={pending}
          className="rounded-[9px] bg-ink px-4 py-2.5 font-display text-[13.5px] font-semibold text-white transition-colors hover:bg-black disabled:opacity-60"
        >
          {pending ? "Rescheduling…" : "Reschedule"}
        </button>
      </div>
    </Modal>
  );
}
