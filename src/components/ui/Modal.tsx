"use client";

import { useEffect } from "react";

export function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(16,18,22,0.55)] p-5 backdrop-blur-sm [animation:backdrop-in_0.15s_ease-out]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-[440px] overflow-y-auto rounded-2xl border border-[rgba(255,255,255,0.06)] bg-card shadow-2xl [animation:modal-in_0.18s_cubic-bezier(0.16,1,0.3,1)]">
        {children}
      </div>
    </div>
  );
}
