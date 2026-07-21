"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAccount } from "@/app/admin/actions";
import { Modal } from "@/components/ui/Modal";

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
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [role, setRole] = useState<"agent" | "team_leader">("agent");
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
      setError("Fill in name and username.");
      return;
    }
    if (takenUsernames.has(trimmedUser)) {
      setError("That username is taken. Pick another.");
      return;
    }
    if (role === "agent" && !agentCode.trim()) {
      setError("Agent code is required for agents.");
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
        <h3 className="mb-1 font-display text-lg font-semibold">Add account</h3>
        <p className="text-[13px] leading-relaxed text-muted">
          Create a login for a new team member. We&apos;ll generate a password for you to share with
          them.
        </p>
      </div>
      <div className="px-[22px] py-[18px]">
        <label className={labelClass}>Full name</label>
        <input
          value={fullName}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g. Lina Haddad"
          className={inputClass}
        />

        <label className={labelClass}>Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "agent" | "team_leader")}
          className={`${inputClass} bg-card`}
        >
          <option value="agent">Agent — books &amp; tracks their own appointments</option>
          <option value="team_leader">Team Leader — views all, prints schedules</option>
        </select>

        <label className={labelClass}>Username</label>
        <input
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setUsernameTouched(true);
          }}
          placeholder="username"
          className={`${inputClass} lowercase`}
        />

        {role === "agent" && (
          <>
            <label className={labelClass}>Agent code</label>
            <input
              value={agentCode}
              onChange={(e) => {
                setAgentCode(e.target.value.toUpperCase());
                setCodeTouched(true);
              }}
              placeholder="e.g. RAW"
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
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-[9px] bg-ink px-4 py-2.5 font-display text-[13.5px] font-semibold text-white transition-colors hover:bg-black disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create account"}
        </button>
      </div>
    </Modal>
  );
}
