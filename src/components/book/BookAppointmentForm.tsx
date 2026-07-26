"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bookAppointment } from "@/app/book/actions";
import { sourceLabel, type ApptSource } from "@/lib/appt-meta";
import { todayISO } from "@/lib/local-date";
import { useLocale } from "@/components/i18n/LocaleProvider";

function isValidPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

const inputClass =
  "w-full rounded-[9px] border border-line bg-card px-3.5 py-3 text-sm focus:border-accent focus:shadow-[0_0_0_3px_rgba(11,209,160,0.15)] focus:outline-none";
const labelClass = "mb-1.5 block text-xs font-medium text-muted";

export function BookAppointmentForm({
  branches,
  agents,
  currentUserId,
  currentUserName,
}: {
  branches: { id: string; name: string }[];
  agents: { id: string; full_name: string }[] | null;
  currentUserId: string;
  currentUserName: string;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<ApptSource>("phone_call");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [apptDate, setApptDate] = useState(todayISO());
  const [apptTime, setApptTime] = useState("");
  const [assignedAgent, setAssignedAgent] = useState(
    agents?.some((a) => a.id === currentUserId) ? currentUserId : (agents?.[0]?.id ?? currentUserId),
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ apptCode: string; customerName: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function resetForm() {
    setCustomerName("");
    setPhone("");
    setSource("phone_call");
    setApptDate(todayISO());
    setApptTime("");
    setNotes("");
  }

  function submit() {
    setError("");
    const trimmedName = customerName.trim();
    if (!trimmedName) {
      setError(t("book.errorNameRequired"));
      return;
    }
    if (!isValidPhone(phone)) {
      setError(t("book.errorInvalidPhone"));
      return;
    }
    if (!apptDate) {
      setError(t("book.errorPickDate"));
      return;
    }

    startTransition(async () => {
      const result = await bookAppointment({
        customerName: trimmedName,
        phone: phone.trim(),
        source,
        branchId: branchId || null,
        apptDate,
        apptTime: apptTime || null,
        assignedAgent,
        notes: notes.trim() || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess({ apptCode: result.apptCode, customerName: trimmedName });
      resetForm();
      router.refresh();
    });
  }

  return (
    <div className="max-w-[640px]">
      {success && (
        <div className="mb-5 flex items-center justify-between rounded-2xl bg-[linear-gradient(150deg,#0E1014,#20242D)] px-5 py-4 text-white">
          <div>
            <div className="font-display text-[15px] font-semibold">
              {t("book.bookedPrefix", { name: success.customerName })}
              <span className="font-mono text-accent">{success.apptCode}</span>
            </div>
            <div className="mt-0.5 text-[12.5px] text-[#9AA1AC]">{t("book.readyForNext")}</div>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="rounded-[9px] border border-white/20 px-3.5 py-2 font-display text-[12.5px] font-semibold text-white transition-colors hover:bg-white/10"
          >
            {t("book.dismiss")}
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-card">
        <div className="border-b border-line px-5 py-4">
          <h3 className="font-display text-[15.5px] font-semibold">{t("book.newAppointment")}</h3>
        </div>

        <div className="grid grid-cols-1 gap-3.5 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>{t("book.customerName")}</label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t("book.customerPlaceholder")}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>{t("book.phone")}</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05X-XXX-XXXX"
              className={`${inputClass} font-mono`}
            />
          </div>

          <div>
            <label className={labelClass}>{t("book.source")}</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as ApptSource)}
              className={`${inputClass} bg-card`}
            >
              {(["phone_call", "whatsapp", "other"] as ApptSource[]).map((s) => (
                <option key={s} value={s}>
                  {sourceLabel(t, s)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>{t("book.apptDate")}</label>
            <input type="date" value={apptDate} onChange={(e) => setApptDate(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>{t("book.apptTime")}</label>
            <input type="time" value={apptTime} onChange={(e) => setApptTime(e.target.value)} className={inputClass} />
          </div>

          {branches.length > 0 && (
            <div className={agents ? "" : "sm:col-span-2"}>
              <label className={labelClass}>{t("book.branch")}</label>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={`${inputClass} bg-card`}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {agents && (
            <div>
              <label className={labelClass}>{t("book.agent")}</label>
              <select
                value={assignedAgent}
                onChange={(e) => setAssignedAgent(e.target.value)}
                className={`${inputClass} bg-card`}
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.id === currentUserId ? t("book.you", { name: a.full_name }) : a.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="sm:col-span-2">
            <label className={labelClass}>{t("book.notes")}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("book.notesPlaceholder")}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="min-h-[16px] text-[12.5px] font-medium text-[#F0524B] sm:col-span-2">{error}</div>
        </div>

        <div className="flex justify-end border-t border-line px-5 py-4">
          <button
            onClick={submit}
            disabled={pending}
            className="rounded-[9px] bg-ink px-5 py-2.5 font-display text-[13.5px] font-semibold text-white transition-all duration-150 hover:-translate-y-px hover:bg-black hover:shadow-md active:translate-y-0 active:shadow-none disabled:opacity-60"
          >
            {pending ? t("book.booking") : t("book.bookAppointment")}
          </button>
        </div>
      </div>

      <p className="mt-3 text-center text-[12px] text-muted">
        {agents ? (
          t("book.autoCodeNote")
        ) : (
          <>
            {t("book.bookingAsPrefix")}
            <span className="font-medium text-text">{currentUserName}</span>
            {t("book.bookingAsSuffix")}
          </>
        )}
      </p>
    </div>
  );
}
