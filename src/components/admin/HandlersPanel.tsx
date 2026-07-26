"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createHandler, setHandlerActive } from "@/app/admin/handlers-actions";
import type { Handler } from "@/lib/handlers-query";
import { useLocale } from "@/components/i18n/LocaleProvider";

function AddHandlerRow({ onAdded }: { onAdded: () => void }) {
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    setError("");
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("handlers.enterName"));
      return;
    }
    startTransition(async () => {
      const result = await createHandler(trimmed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      onAdded();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5 px-5 py-3.5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder={t("handlers.namePlaceholder")}
        className="min-w-[160px] flex-1 rounded-[9px] border border-line bg-card px-3.5 py-2.5 text-sm focus:border-accent focus:shadow-[0_0_0_3px_rgba(11,209,160,0.15)] focus:outline-none"
      />
      <button
        onClick={submit}
        disabled={pending}
        className="rounded-[9px] bg-ink px-4 py-2.5 font-display text-[13px] font-semibold text-white transition-all duration-150 hover:-translate-y-px hover:bg-black hover:shadow-md active:translate-y-0 active:shadow-none disabled:opacity-60"
      >
        {pending ? t("common.adding") : t("common.add")}
      </button>
      {error && <div className="w-full text-[12px] font-medium text-[#F0524B]">{error}</div>}
    </div>
  );
}

function HandlerRow({ handler }: { handler: Handler }) {
  const router = useRouter();
  const { t } = useLocale();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await setHandlerActive(handler.id, !handler.active);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between border-t border-line px-5 py-3">
      <span className="text-[13.5px] font-medium text-text">{handler.name}</span>
      <div className="flex items-center gap-2.5">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            handler.active ? "bg-accent-soft text-accent-deep" : "bg-[#F2F3F5] text-[#9AA1AC]"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${handler.active ? "bg-accent" : "bg-[#B8BEC8]"}`} />
          {handler.active ? t("admin.active") : t("handlers.inactive")}
        </span>
        <button
          onClick={toggle}
          disabled={pending}
          className="rounded-lg border border-line bg-card px-2.5 py-1.5 font-display text-xs font-semibold text-muted transition-colors hover:border-[#9AA1AC] hover:text-text disabled:opacity-50"
        >
          {handler.active ? t("handlers.deactivate") : t("admin.reactivate")}
        </button>
      </div>
    </div>
  );
}

export function HandlersPanel({ handlers }: { handlers: Handler[] }) {
  const router = useRouter();
  const { t } = useLocale();

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-card shadow-card">
      <div className="border-b border-line px-5 py-4">
        <h3 className="font-display text-[15.5px] font-semibold">{t("handlers.title")}</h3>
        <p className="mt-1 text-[12.5px] text-muted">{t("handlers.intro")}</p>
      </div>

      {handlers.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted">{t("handlers.noneYet")}</p>
      ) : (
        <div>
          {handlers.map((h) => (
            <HandlerRow key={h.id} handler={h} />
          ))}
        </div>
      )}

      <div className="border-t border-line">
        <AddHandlerRow onAdded={() => router.refresh()} />
      </div>
    </div>
  );
}
