"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetPassword, setSuspended } from "@/app/admin/actions";
import { agentColor, initials } from "@/lib/agent-visuals";
import { Kpi } from "@/components/ui/Kpi";
import { CreateAccountModal } from "./CreateAccountModal";
import { CredsModal } from "./CredsModal";
import { RemoveConfirmModal } from "./RemoveConfirmModal";

export type Account = {
  id: string;
  fullName: string;
  username: string;
  role: "agent" | "team_leader";
  status: "active" | "suspended";
  agentCode: string | null;
  apptCount: number;
};

type ModalState =
  | { type: "create" }
  | { type: "creds"; title: string; subtitle: string; username: string; password: string }
  | { type: "remove"; account: Account }
  | null;

function RoleChip({ role }: { role: Account["role"] }) {
  if (role === "team_leader") {
    return (
      <span className="rounded-md bg-[#181B22] px-2 py-1 font-mono text-[10.5px] font-bold uppercase tracking-wide text-accent">
        Team Leader
      </span>
    );
  }
  return (
    <span className="rounded-md bg-[#EEF0F3] px-2 py-1 font-mono text-[10.5px] font-bold uppercase tracking-wide text-[#5B6470]">
      Agent
    </span>
  );
}

function StatusChip({ status }: { status: Account["status"] }) {
  const suspended = status === "suspended";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        suspended ? "bg-[#F2F3F5] text-[#9AA1AC]" : "bg-accent-soft text-accent-deep"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${suspended ? "bg-[#B8BEC8]" : "bg-accent"}`} />
      {suspended ? "Suspended" : "Active"}
    </span>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "danger" | "go";
}) {
  const hoverClass =
    variant === "danger"
      ? "hover:border-[#F0524B] hover:text-[#F0524B] hover:bg-[#FEECEA]"
      : variant === "go"
        ? "hover:border-accent-deep hover:text-accent-deep hover:bg-accent-soft"
        : "hover:border-[#9AA1AC] hover:text-text";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border border-line bg-card px-2.5 py-1.5 font-display text-xs font-semibold text-muted transition-colors disabled:opacity-50 ${hoverClass}`}
    >
      {children}
    </button>
  );
}

function AccountRow({
  account,
  onShowCreds,
  onConfirmRemove,
}: {
  account: Account;
  onShowCreds: (username: string, password: string) => void;
  onConfirmRemove: (account: Account) => void;
}) {
  const router = useRouter();
  const [resetting, startReset] = useTransition();
  const [toggling, startToggle] = useTransition();
  const [rowError, setRowError] = useState("");

  function handleReset() {
    setRowError("");
    startReset(async () => {
      const result = await resetPassword(account.id);
      if (!result.ok) {
        setRowError(result.error);
        return;
      }
      onShowCreds(account.username, result.data.password);
    });
  }

  function handleToggleSuspend() {
    setRowError("");
    startToggle(async () => {
      const result = await setSuspended(account.id, account.status !== "suspended");
      if (!result.ok) {
        setRowError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <tr className="transition-colors hover:bg-[#F7F8FA]">
      <td className="border-b border-line px-3 py-3 text-[13.5px]">
        <span className="inline-flex items-center gap-2 font-medium">
          <span
            className="flex h-[22px] w-[22px] items-center justify-center rounded-md font-display text-[10.5px] font-bold text-white"
            style={{ background: agentColor(account.fullName) }}
          >
            {initials(account.fullName)}
          </span>
          {account.fullName}
        </span>
      </td>
      <td className="border-b border-line px-3 py-3 font-mono text-[13px]">{account.username}</td>
      <td className="border-b border-line px-3 py-3">
        <RoleChip role={account.role} />
      </td>
      <td className="border-b border-line px-3 py-3 font-mono text-[13.5px] font-semibold">
        {account.apptCount}
      </td>
      <td className="border-b border-line px-3 py-3">
        <StatusChip status={account.status} />
      </td>
      <td className="border-b border-line px-3 py-3">
        <div className="flex flex-wrap justify-end gap-1.5">
          <ActionButton onClick={handleReset} disabled={resetting}>
            {resetting ? "Resetting…" : "Reset password"}
          </ActionButton>
          <ActionButton onClick={handleToggleSuspend} disabled={toggling} variant="go">
            {account.status === "suspended" ? "Reactivate" : "Suspend"}
          </ActionButton>
          <ActionButton onClick={() => onConfirmRemove(account)} variant="danger">
            Remove
          </ActionButton>
        </div>
        {rowError && <div className="mt-1 text-right text-[11.5px] font-medium text-[#F0524B]">{rowError}</div>}
      </td>
    </tr>
  );
}

function EmptyState() {
  return (
    <div className="px-5 py-11 text-center text-muted">
      <div className="mx-auto mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} className="h-[22px] w-[22px] stroke-accent-deep">
          <path d="M12 2l7 4v5c0 4.4-3 8.3-7 9-4-0.7-7-4.6-7-9V6l7-4z" />
        </svg>
      </div>
      <h4 className="mb-1 font-display text-base font-semibold text-text">No accounts yet</h4>
      <p className="text-sm">Add your first agent to get them booking.</p>
    </div>
  );
}

export function AdminPanelClient({
  accounts,
  totalAppointments,
  bookedToday,
}: {
  accounts: Account[];
  totalAppointments: number;
  bookedToday: number;
}) {
  const [modal, setModal] = useState<ModalState>(null);
  const activeCount = accounts.filter((a) => a.status === "active").length;
  const takenCodes = new Set(accounts.map((a) => a.agentCode).filter((c): c is string => Boolean(c)));
  const takenUsernames = new Set(accounts.map((a) => a.username));

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-3">
        <Kpi label="Team members" value={accounts.length} sub={`${activeCount} active`} dot="#3B7BF6" />
        <Kpi label="Appointments" value={totalAppointments} sub="all time" dot="#8A6BF0" />
        <Kpi
          label="Booked today"
          value={bookedToday}
          sub={new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" })}
          dot="#0BD1A0"
          accent
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="font-display text-[15.5px] font-semibold">Team accounts</h3>
          <button
            onClick={() => setModal({ type: "create" })}
            className="flex items-center gap-2 rounded-[9px] bg-ink px-[15px] py-2.5 font-display text-[13.5px] font-semibold text-white transition-colors hover:bg-black"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} className="h-4 w-4 stroke-current">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add account
          </button>
        </div>

        {accounts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  {["Name", "Username", "Role", "Appts", "Status", ""].map((h) => (
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
                {accounts.map((a) => (
                  <AccountRow
                    key={a.id}
                    account={a}
                    onShowCreds={(username, password) =>
                      setModal({
                        type: "creds",
                        title: "Password reset",
                        subtitle: `Share this with ${a.fullName}. They can change it later.`,
                        username,
                        password,
                      })
                    }
                    onConfirmRemove={(account) => setModal({ type: "remove", account })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mx-auto mt-4 max-w-[760px] text-[12.5px] leading-relaxed text-muted">
        You create every account here — employees can only sign in, never self-register. Suspending
        blocks sign-in without deleting their history; removing deletes the login but keeps their
        booked appointments in the records.
      </p>

      {modal?.type === "create" && (
        <CreateAccountModal
          takenUsernames={takenUsernames}
          takenCodes={takenCodes}
          onClose={() => setModal(null)}
          onCreated={(username, password) =>
            setModal({
              type: "creds",
              title: "Account created",
              subtitle: `Share these with ${username}. They can change the password later.`,
              username,
              password,
            })
          }
        />
      )}
      {modal?.type === "creds" && (
        <CredsModal
          title={modal.title}
          subtitle={modal.subtitle}
          username={modal.username}
          password={modal.password}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "remove" && (
        <RemoveConfirmModal
          fullName={modal.account.fullName}
          userId={modal.account.id}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
