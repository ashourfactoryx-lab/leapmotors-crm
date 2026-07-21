export function PlaceholderView({ note }: { note: string }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-card p-10 text-center">
      <p className="font-display text-lg font-semibold text-text">Not built yet</p>
      <p className="mt-1.5 max-w-sm text-sm text-muted">{note}</p>
    </div>
  );
}
