"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/components/i18n/LocaleProvider";

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
  const { t } = useLocale();
  const [date, setDate] = useState(currentDate);
  const [time, setTime] = useState(currentTime ? currentTime.slice(0, 5) : "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError("");
    if (!date) {
      setError(t("reschedule.pickDate"));
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
        <h3 className="mb-1 font-display text-lg font-semibold">{t("reschedule.title", { name: customerName })}</h3>
        <p className="text-[13px] leading-relaxed text-muted">{t("reschedule.intro")}</p>
      </div>
      <div className="px-[22px] py-[18px]">
        <label className="mb-1.5 block text-xs font-medium text-muted">{t("reschedule.newDate")}</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />

        <label className="mb-1.5 block text-xs font-medium text-muted">{t("reschedule.newTime")}</label>
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
          {t("common.cancel")}
        </button>
        <button
          onClick={confirm}
          disabled={pending}
          className="rounded-[9px] bg-ink px-4 py-2.5 font-display text-[13.5px] font-semibold text-white transition-all duration-150 hover:-translate-y-px hover:bg-black hover:shadow-md active:translate-y-0 active:shadow-none disabled:opacity-60"
        >
          {pending ? t("reschedule.rescheduling") : t("reschedule.confirm")}
        </button>
      </div>
    </Modal>
  );
}
