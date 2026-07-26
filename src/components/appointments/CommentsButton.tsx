"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";

export function CommentsButton({ onClick }: { onClick: () => void }) {
  const { t } = useLocale();
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 font-display text-xs font-semibold text-muted transition-colors hover:border-[#9AA1AC] hover:text-text"
    >
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} className="h-3.5 w-3.5 stroke-current">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
      {t("comments.button")}
    </button>
  );
}
