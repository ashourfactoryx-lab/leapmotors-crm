import { STATUS_META, type ApptStatus } from "@/lib/appt-meta";

const RADIUS = 15.9155; // makes the circle's circumference exactly 100 units
const CENTER = 21;

export function StatusDonut({ data, total }: { data: { status: ApptStatus; count: number }[]; total: number }) {
  const safeTotal = total || 1;

  // Each segment's dashoffset is 25 (12 o'clock start) minus the cumulative
  // length of every segment drawn before it — folded functionally so no
  // variable is mutated across renders.
  const segments = data
    .filter((d) => d.count > 0)
    .reduce<{ status: ApptStatus; len: number; offset: number }[]>((acc, d) => {
      const len = (d.count / safeTotal) * 100;
      const drawn = acc.reduce((sum, s) => sum + s.len, 0);
      acc.push({ status: d.status, len, offset: 25 - drawn });
      return acc;
    }, []);

  return (
    <svg width={150} height={150} viewBox="0 0 42 42">
      {segments.map((s) => (
        <circle
          key={s.status}
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={STATUS_META[s.status].color}
          strokeWidth={5.4}
          strokeDasharray={`${s.len} ${100 - s.len}`}
          strokeDashoffset={s.offset}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
        />
      ))}
      <text x={CENTER} y="20.5" textAnchor="middle" fontSize="7" fontWeight="700" fontFamily="Space Grotesk" fill="#171A20">
        {total}
      </text>
      <text x={CENTER} y="26" textAnchor="middle" fontSize="3" fontFamily="JetBrains Mono" fill="#9AA1AC">
        TOTAL
      </text>
    </svg>
  );
}
