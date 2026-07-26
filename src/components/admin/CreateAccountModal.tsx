"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAccount } from "@/app/admin/actions";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/components/i18n/LocaleProvider";

function suggestUsername(name: string) {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z؀-ۿ\s]/g, "");
  return (cleaned.split(/\s+/)[0] || "").slice(0, 14);
}

function suggestAgentCode(name: string, taken: Set<string>) {
  const base = (name.replace(/[^A-Za-z]/g, "").slice(0, 3) || "AGT").toUpperCase();
  if (!base || !taken.has(base)) return base;
  let i = 1;
  let candidate = base;
  while (taken.has(candidate)) {
    candidate = `${base.slice(0, 2)}${i}`;
    i++;
  }
  return candidate;
}

export function CreateAccountModal({
  takenUsernames,
  takenCodes,
  onClose,
  onCreated,
}: {
  takenUsernames: Set<string>;
  takenCodes: Set<string>;
  onClose: () => void;
  onCreated: (username: string, password: string) => void;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [role, setRole] = useState<"agent" | "team_leader" | "showroom">("agent");
  const [agentCode, setAgentCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleNameChange(value: string) {
    setFullName(value);
    if (!usernameTouched) setUsername(suggestUsername(value));
    if (!codeTouched) setAgentCode(suggestAgentCode(value, takenCodes));
  }

  function submit() {
    setError("");
    const trimmedName = fullName.trim();
    const trimmedUser = username.trim().toLowerCase();
    if (!trimmedName || !trimmedUser) {
      setError(t("createAccount.errorFillIn"));
      return;
    }
    if (takenUsernames.has(trimmedUser)) {
      setError(t("createAccount.errorUsernameTaken"));
      return;
    }
    if (role === "agent" && !agentCode.trim()) {
      setError(t("createAccount.errorAgentCodeRequired"));
      return;
    }

    startTransition(async () => {
      const result = await createAccount({ fullName: trimmedName, username: trimmedUser, role, agentCode });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      onCreated(result.data.username, result.data.password);
    });
  }

  const inputClass =
    "mb-3.5 w-full rounded-[9px] border border-line px-3.5 py-3 text-sm focus:border-accent focus:shadow-[0_0_0_3px_rgba(11,209,160,0.15)] focus:outline-none";
  const labelClass = "mb-1.5 block text-xs font-medium text-muted";

  return (
    <Modal onClose={onClose}>
      <div className="px-[22px] pt-5">
        <h3 className="mb-1 font-display text-lg font-semibold">{t("createAccount.title")}</h3>
        <p className="text-[13px] leading-relaxed text-muted">{t("createAccount.intro")}</p>
      </div>
      <div className="px-[22px] py-[18px]">
        <label className={labelClass}>{t("createAccount.fullName")}</label>
        <input
          value={fullName}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder={t("createAccount.fullNamePlaceholder")}
          className={inputClass}
        />

        <label className={labelClass}>{t("createAccount.role")}</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "agent" | "team_leader" | "showroom")}
          className={`${inputClass} bg-card`}
        >
          <option value="agent">{t("createAccount.roleAgent")}</option>
          <option value="team_leader">{t("createAccount.roleLeader")}</option>
          <option value="showroom">{t("createAccount.roleShowroom")}</option>
        </select>

        <label className={labelClass}>{t("createAccount.username")}</label>
        <input
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setUsernameTouched(true);
          }}
          placeholder={t("createAccount.usernamePlaceholder")}
          className={`${inputClass} lowercase`}
        />

        {role === "agent" && (
          <>
            <label className={labelClass}>{t("createAccount.agentCode")}</label>
            <input
              value={agentCode}
              onChange={(e) => {
                setAgentCode(e.target.value.toUpperCase());
                setCodeTouched(true);
              }}
              placeholder={t("createAccount.agentCodePlaceholder")}
              maxLength={4}
              className={`${inputClass} uppercase`}
            />
          </>
        )}

        <div className="min-h-[16px] text-[12.5px] font-medium text-[#F0524B]">{error}</div>
      </div>
      <div className="flex justify-end gap-2.5 px-[22px] pb-5">
        <button
          onClick={onClose}
          className="rounded-[9px] border border-line bg-card px-4 py-2.5 font-display text-[13.5px] font-semibold text-text transition-colors hover:border-[#9AA1AC]"
        >
          {t("common.cancel")}
        </button>
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-[9px] bg-ink px-4 py-2.5 font-display text-[13.5px] font-semibold text-white transition-all duration-150 hover:-translate-y-px hover:bg-black hover:shadow-md active:translate-y-0 active:shadow-none disabled:opacity-60"
        >
          {pending ? t("createAccount.creating") : t("createAccount.createAccount")}
        </button>
      </div>
    </Modal>
  );
}
