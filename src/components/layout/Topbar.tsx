"use client";

export function Topbar({
  viewTitle,
  onMenuClick,
  onlineCount = 1,
}: {
  viewTitle: string;
  onMenuClick: () => void;
  onlineCount?: number;
}) {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-paper/86 px-4 backdrop-blur-sm print:hidden md:px-[30px]">
      <div className="flex items-center gap-1.5">
        <button
          onClick={onMenuClick}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[9px] border border-line md:hidden"
          aria-label="Toggle navigation"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} className="h-5 w-5 stroke-current">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div>
          <div className="font-mono text-xs tracking-[0.4px] text-muted">
            WORKSPACE · {viewTitle.toUpperCase()}
          </div>
          <h2 className="font-display text-[19px] font-semibold">{viewTitle}</h2>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="hidden items-center gap-1.5 text-[13px] text-muted sm:flex">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <b className="text-text">{onlineCount}</b> online
        </div>
        <div className="flex items-center gap-2 rounded-[9px] border border-line bg-card px-[13px] py-2 text-[13px] font-medium text-muted">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <b className="font-display text-text">{today}</b>
        </div>
      </div>
    </div>
  );
}
