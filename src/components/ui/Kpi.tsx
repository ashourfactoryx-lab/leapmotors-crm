export function Kpi({
  label,
  value,
  sub,
  dot,
  accent,
}: {
  label: string;
  value: number;
  sub: string;
  dot?: string;
  accent?: boolean;
}) {
  const dotColor = accent ? "#0BD1A0" : dot;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 shadow-card transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover ${
        accent
          ? "border-transparent bg-[linear-gradient(150deg,#0E1014,#20242D)] text-white"
          : "border-line bg-card"
      }`}
    >
      {dotColor && (
        <span
          className="absolute right-3.5 top-4 h-2 w-2 rounded-full transition-shadow duration-200 rtl:right-auto rtl:left-3.5"
          style={{ background: dotColor, boxShadow: `0 0 0 4px ${dotColor}1A` }}
        />
      )}
      <div className={`flex items-center gap-1.5 text-xs font-medium ${accent ? "text-[#9AA1AC]" : "text-muted"}`}>
        {label}
      </div>
      <div className="mt-2.5 font-display text-[28px] font-semibold leading-none tracking-tight">
        {value}
      </div>
      <div className={`mt-1 font-mono text-[11.5px] ${accent ? "text-accent" : "text-[#9AA1AC]"}`}>{sub}</div>
    </div>
  );
}
