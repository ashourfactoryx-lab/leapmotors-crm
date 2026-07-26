"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchComments, type Comment } from "@/lib/comments-query";
import { addComment } from "@/lib/comment-actions";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { agentColor, initials } from "@/lib/agent-visuals";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { dateLocaleTag } from "@/lib/i18n/locale";

export function CommentsModal({
  apptId,
  customerName,
  onClose,
}: {
  apptId: string;
  customerName: string;
  onClose: () => void;
}) {
  const { t, locale } = useLocale();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function formatWhen(iso: string) {
    return new Date(iso).toLocaleString(dateLocaleTag(locale), {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = createClient();
        const rows = await fetchComments(supabase, apptId);
        if (cancelled) return;
        setComments(rows);
        setLoadError("");
      } catch {
        if (!cancelled) setLoadError(t("comments.couldntLoad"));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [apptId, t]);

  async function refetch() {
    try {
      const supabase = createClient();
      const rows = await fetchComments(supabase, apptId);
      setComments(rows);
      setLoadError("");
    } catch {
      setLoadError(t("comments.couldntLoad"));
    }
  }

  function submit() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setError("");
    startTransition(async () => {
      const result = await addComment(apptId, trimmed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDraft("");
      await refetch();
    });
  }

  return (
    <Modal onClose={onClose}>
      <div className="px-[22px] pt-5">
        <h3 className="mb-1 font-display text-[13px] font-semibold uppercase tracking-wide text-muted">
          {t("comments.title")}
        </h3>
        <p className="font-display text-[19px] font-semibold text-text">{customerName}</p>
      </div>

      <div className="max-h-[320px] min-h-[80px] overflow-y-auto border-y border-line px-[22px] py-4">
        {loadError ? (
          <p className="text-center text-[13px] font-medium text-[#F0524B]">{loadError}</p>
        ) : comments === null ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-[13px] text-muted">{t("comments.noneYet")}</p>
        ) : (
          <div className="flex flex-col gap-3.5">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <span
                  className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-md font-display text-[10.5px] font-bold text-white"
                  style={{ background: agentColor(c.authorName) }}
                >
                  {initials(c.authorName)}
                </span>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-[13px] font-semibold">{c.authorName}</span>
                    <span className="text-[11px] text-muted">{formatWhen(c.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-[13px] text-text">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-[22px] py-[18px]">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("comments.placeholder")}
          rows={3}
          className="w-full resize-none rounded-[9px] border border-line px-3.5 py-3 text-sm focus:border-accent focus:shadow-[0_0_0_3px_rgba(11,209,160,0.15)] focus:outline-none"
        />
        <div className="mt-1.5 min-h-[16px] text-[12.5px] font-medium text-[#F0524B]">{error}</div>
      </div>
      <div className="flex justify-end gap-2.5 px-[22px] pb-5">
        <button
          onClick={onClose}
          className="rounded-[9px] border border-line bg-card px-4 py-2.5 font-display text-[13.5px] font-semibold text-text transition-colors hover:border-[#9AA1AC]"
        >
          {t("common.close")}
        </button>
        <button
          onClick={submit}
          disabled={pending || !draft.trim()}
          className="flex items-center gap-2 rounded-[9px] bg-ink px-4 py-2.5 font-display text-[13.5px] font-semibold text-white transition-all duration-150 hover:-translate-y-px hover:bg-black hover:shadow-md active:translate-y-0 active:shadow-none disabled:opacity-60"
        >
          {pending && <Spinner size={14} />}
          {pending ? t("comments.posting") : t("comments.post")}
        </button>
      </div>
    </Modal>
  );
}
