"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/components/i18n/LocaleProvider";

export function CredsModal({
  title,
  subtitle,
  username,
  password,
  onClose,
}: {
  title: string;
  subtitle: string;
  username: string;
  password: string;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  async function copyBoth() {
    await navigator.clipboard.writeText(`Username: ${username}\nPassword: ${password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal onClose={onClose}>
      <div className="px-[22px] pt-5">
        <h3 className="mb-1 font-display text-lg font-semibold">{title}</h3>
        <p className="text-[13px] leading-relaxed text-muted">{subtitle}</p>
      </div>
      <div className="px-[22px] py-[18px]">
        <div className="mb-1.5 rounded-[11px] bg-ink px-4 py-3.5">
          <div className="font-mono text-[11px] uppercase tracking-wide text-[#8B93A0]">
            {t("createAccount.username")}
          </div>
          <div className="mt-0.5 font-mono text-base font-semibold text-white">{username}</div>
        </div>
        <div className="rounded-[11px] bg-ink px-4 py-3.5">
          <div className="font-mono text-[11px] uppercase tracking-wide text-[#8B93A0]">{t("creds.password")}</div>
          <div className="mt-0.5 font-mono text-base font-semibold text-accent">{password}</div>
        </div>
        <button
          onClick={copyBoth}
          className="mt-3 w-full rounded-[9px] border border-line py-2 text-[12.5px] font-semibold text-muted transition-colors hover:border-[#9AA1AC] hover:text-text"
        >
          {copied ? t("creds.copied") : t("creds.copyBoth")}
        </button>
      </div>
      <div className="flex justify-end px-[22px] pb-5">
        <button
          onClick={onClose}
          className="rounded-[9px] bg-ink px-4 py-2.5 font-display text-[13.5px] font-semibold text-white transition-all duration-150 hover:-translate-y-px hover:bg-black hover:shadow-md active:translate-y-0 active:shadow-none"
        >
          {t("creds.done")}
        </button>
      </div>
    </Modal>
  );
}
