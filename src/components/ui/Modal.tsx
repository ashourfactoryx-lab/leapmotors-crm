"use client";

export function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(16,18,22,0.55)] p-5 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[440px] overflow-hidden rounded-2xl bg-card shadow-2xl">{children}</div>
    </div>
  );
}
