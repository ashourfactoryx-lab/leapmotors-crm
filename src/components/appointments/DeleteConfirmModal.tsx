"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/components/i18n/LocaleProvider";

// A typed-confirmation gate before an irreversible delete — not a real
// authentication boundary (the actual access control is the "appt delete"
// RLS policy, admin/team_leader only). This just adds deliberate friction
// so a stray click can't wipe out a real appointment.
const CONFIRM_PASSWORD = "Ariagto";

export function DeleteConfirmModal({
  customerName,
  onCancel,
  onConfirm,
}: {
  customerName: string;
  onCancel: () => void;
  onConfirm: () => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const { t } = useLocale();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function confirm() {
    if (password !== CONFIRM_PASSWORD) {
      setError(t("deleteConfirm.wrongPassword"));
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await onConfirm();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onCancel();
    });
  }

  return (
    <Modal onClose={onCancel}>
      <div className="px-[22px] pt-5">
        <h3 className="mb-1 font-display text-lg font-semibold">{t("deleteConfirm.title", { name: customerName })}</h3>
        <p className="text-[13px] leading-relaxed text-muted">{t("deleteConfirm.intro")}</p>
      </div>
      <div className="px-[22px] pt-3.5">
        <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="delete-confirm-password">
          {t("deleteConfirm.passwordLabel")}
        </label>
        <input
          id="delete-confirm-password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirm();
          }}
          autoFocus
          className="w-full rounded-[9px] border border-line px-[15px] py-[13px] text-[15px] text-text transition-colors focus:border-accent focus:outline-none"
        />
      </div>
      <div className="px-[22px] pt-2 text-[12.5px] font-medium text-[#F0524B]">{error}</div>
      <div className="flex justify-end gap-2.5 px-[22px] pb-5 pt-2">
        <button
          onClick={onCancel}
          className="rounded-[9px] border border-line bg-card px-4 py-2.5 font-display text-[13.5px] font-semibold text-text transition-colors hover:border-[#9AA1AC]"
        >
          {t("common.cancel")}
        </button>
        <button
          onClick={confirm}
          disabled={pending || !password}
          className="rounded-[9px] bg-[#F0524B] px-4 py-2.5 font-display text-[13.5px] font-semibold text-white transition-colors hover:bg-[#C63A34] disabled:opacity-60"
        >
          {pending ? t("deleteConfirm.deleting") : t("deleteConfirm.deleteAppointment")}
        </button>
      </div>
    </Modal>
  );
}
