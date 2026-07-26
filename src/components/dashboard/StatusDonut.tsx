"use client";

import { useEffect, useState } from "react";
import { STATUS_META, statusLabel, type ApptStatus } from "@/lib/appt-meta";
import { useLocale } from "@/components/i18n/LocaleProvider";

const RADIUS = 15.9155; // makes the circle's circumference exactly 100 units
const CENTER = 21;
const GAP = 1.1; // % of circumference left blank between adjacent segments

export function StatusDonut({ data, total }: { data: { status: ApptStatus; count: number }[]; total: number }) {
  const { t } = useLocale();
  const safeTotal = total || 1;

  // Segments animate in from zero on mount rather than appearing fully
  // drawn — CSS can't transition "from nothing" on first paint, so the
  // real lengths are only applied a tick after mount.
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Each segment's dashoffset is 25 (12 o'clock start) minus the cumulative
  // length of every segment drawn before it — folded functionally so no
  // variable is mutated across renders.
  const segments = data
    .filter((d) => d.count > 0)
    .reduce<{ status: ApptStatus; count: number; len: number; offset: number }[]>((acc, d) => {
      const len = (d.count / safeTotal) * 100;
      const drawn = acc.reduce((sum, s) => sum + s.len, 0);
      acc.push({ status: d.status, count: d.count, len, offset: 25 - drawn });
      return acc;
    }, []);

  return (
    <svg width={150} height={150} viewBox="0 0 42 42">
      {segments.map((s) => {
        const visibleLen = Math.max(0, s.len - GAP);
        const pct = Math.round((s.count / safeTotal) * 100);
        return (
          <circle
            key={s.status}
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={STATUS_META[s.status].color}
            strokeWidth={5.4}
            strokeLinecap="round"
            strokeDasharray={`${grown ? visibleLen : 0} ${100 - visibleLen}`}
            strokeDashoffset={s.offset}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            className="cursor-pointer transition-[stroke-dasharray,opacity] duration-700 ease-out hover:opacity-75"
            style={{ transitionDelay: grown ? "0ms" : "80ms" }}
          >
            <title>
              {statusLabel(t, s.status)}: {s.count} ({pct}%)
            </title>
          </circle>
        );
      })}
      <text x={CENTER} y="20.5" textAnchor="middle" fontSize="7" fontWeight="700" fontFamily="Space Grotesk" fill="#171A20">
        {total}
      </text>
      <text x={CENTER} y="26" textAnchor="middle" fontSize="3" fontFamily="JetBrains Mono" fill="#9AA1AC">
        {t("dashboard.totalLabel")}
      </text>
    </svg>
  );
}
