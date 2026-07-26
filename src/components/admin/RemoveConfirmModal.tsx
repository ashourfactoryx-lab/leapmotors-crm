"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeAccount } from "@/app/admin/actions";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/components/i18n/LocaleProvider";

export function RemoveConfirmModal({
  fullName,
  userId,
  onClose,
}: {
  fullName: string;
  userId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function confirm() {
    startTransition(async () => {
      const result = await removeAccount(userId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal onClose={onClose}>
      <div className="px-[22px] pt-5">
        <h3 className="mb-1 font-display text-lg font-semibold">{t("removeConfirm.title", { name: fullName })}</h3>
        <p className="text-[13px] leading-relaxed text-muted">{t("removeConfirm.intro")}</p>
      </div>
      <div className="px-[22px] pt-2 text-[12.5px] font-medium text-[#F0524B]">{error}</div>
      <div className="flex justify-end gap-2.5 px-[22px] pb-5 pt-2">
        <button
          onClick={onClose}
          className="rounded-[9px] border border-line bg-card px-4 py-2.5 font-display text-[13.5px] font-semibold text-text transition-colors hover:border-[#9AA1AC]"
        >
          {t("common.cancel")}
        </button>
        <button
          onClick={confirm}
          disabled={pending}
          className="rounded-[9px] bg-[#F0524B] px-4 py-2.5 font-display text-[13.5px] font-semibold text-white transition-colors hover:bg-[#C63A34] disabled:opacity-60"
        >
          {pending ? t("removeConfirm.removing") : t("removeConfirm.removeAccount")}
        </button>
      </div>
    </Modal>
  );
}
