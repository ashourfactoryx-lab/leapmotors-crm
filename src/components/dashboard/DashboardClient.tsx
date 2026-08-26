"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Kpi } from "@/components/ui/Kpi";
import { StatusDonut } from "./StatusDonut";
import { STATUS_META, statusLabel } from "@/lib/appt-meta";
import { agentColor, initials } from "@/lib/agent-visuals";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  fetchAllAppointmentAgentStatus,
  computeDashboardStats,
  monthToRange,
  type DashboardStats,
  type MonthOption,
} from "@/lib/dashboard-query";

export function DashboardClient({
  initialStats,
  monthOptions,
}: {
  initialStats: DashboardStats;
  monthOptions: MonthOption[];
}) {
  const { t } = useLocale();
  const [period, setPeriod] = useState<"all" | string>("all");
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFirstRun = useRef(true);

  // Leaderboard bars grow in from zero on first paint — a CSS transition
  // can't animate "from nothing" on the same render that sets the real
  // width, so the real widths only apply a tick after mount.
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const range = period === "all" ? undefined : monthToRange(period);

    async function refresh() {
      setLoading(true);
      try {
        const [rows, { data: profiles }] = await Promise.all([
          fetchAllAppointmentAgentStatus(supabase, range),
          supabase.from("profiles").select("id, full_name").eq("status", "active").eq("role", "agent"),
        ]);
        if (cancelled) return;
        setStats(computeDashboardStats(rows, profiles ?? []));
        setError(null);
      } catch {
        if (!cancelled) setError(t("dashboard.couldntLoad"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const skipInitialFetch = isFirstRun.current && period === "all";
    isFirstRun.current = false;
    if (!skipInitialFetch) refresh();

    // See DailyScheduleClient — @supabase/ssr's cookie-based client needs the
    // JWT explicitly forwarded to the Realtime socket, or RLS silently blocks
    // every event.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel("dashboard:appointments")
        .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => refresh())
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [period, t]);

  const maxBooked = Math.max(1, ...stats.leaderboard.map((r) => r.booked));

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <label className="text-[13px] font-medium text-muted" htmlFor="dashboard-period">
          {t("dashboard.period")}
        </label>
        <select
          id="dashboard-period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-[9px] border border-line bg-card px-3 py-2 text-[13px] font-medium text-text"
        >
          <option value="all">{t("dashboard.allTime")}</option>
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        {loading && <span className="text-[12.5px] text-muted">{t("common.loading")}</span>}
        {error && <span className="text-[12.5px] font-medium text-[#F0524B]">{error}</span>}
      </div>

      <div className={`mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4 transition-opacity ${loading ? "opacity-50" : ""}`}>
        <Kpi
          label={t("dashboard.totalAppointments")}
          value={stats.total}
          sub={t("dashboard.agentsCount", { count: stats.leaderboard.length })}
          dot="#3B7BF6"
        />
        <Kpi
          label={t("dashboard.attended")}
          value={stats.attended}
          sub={t("dashboard.ofDecided", { rate: stats.attendanceRate, count: stats.decided })}
          dot="#0BD1A0"
        />
        <Kpi label={t("dashboard.noShows")} value={stats.noShow} sub={t("dashboard.flagged")} dot="#F0524B" />
        <Kpi
          label={t("dashboard.sold")}
          value={stats.sold}
          sub={t("dashboard.ofAttended", { rate: stats.conversionRate, count: stats.attended })}
          dot="#C79A3B"
          accent
        />
      </div>

      <div className={`grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_1fr] transition-opacity ${loading ? "opacity-50" : ""}`}>
        <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h3 className="font-display text-[15.5px] font-semibold">{t("dashboard.agentLeaderboard")}</h3>
            <span className="text-xs text-muted">{t("dashboard.byBooked")}</span>
          </div>
          <div className="py-2.5">
            {stats.leaderboard.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted">{t("dashboard.noAppointmentsYet")}</p>
            ) : (
              stats.leaderboard.map((r, i) => (
                <div
                  key={r.agentId}
                  className="grid grid-cols-[26px_1.3fr_2.4fr_46px] items-center gap-3 px-5 py-2.5 transition-colors duration-150 hover:bg-[#FAFBFC]"
                >
                  <div className="font-mono text-xs font-semibold text-[#9AA1AC]">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="flex items-center gap-2.5 text-[13.5px] font-medium">
                    <span
                      className="flex h-[22px] w-[22px] items-center justify-center rounded-md font-display text-[10px] font-bold text-white"
                      style={{ background: agentColor(r.name) }}
                    >
                      {initials(r.name)}
                    </span>
                    {r.name}
                  </div>
                  <div className="h-[9px] overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-accent-deep),var(--color-accent))] transition-[width] duration-700 ease-out"
                      style={{ width: grown ? `${Math.round((r.booked / maxBooked) * 100)}%` : "0%" }}
                    />
                  </div>
                  <div className="text-right font-mono text-[13px] font-semibold">{r.booked}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h3 className="font-display text-[15.5px] font-semibold">{t("dashboard.statusBreakdown")}</h3>
            <span className="text-xs text-muted">{t("dashboard.total", { count: stats.total })}</span>
          </div>
          <div className="flex flex-wrap items-center gap-6 px-5 py-5">
            <StatusDonut data={stats.statusBreakdown} total={stats.total} />
            <div className="grid min-w-[200px] flex-1 gap-2">
              {stats.statusBreakdown.map((s) => (
                <div key={s.status} className="flex items-center gap-2.5 text-[13px]">
                  <span
                    className="h-[11px] w-[11px] flex-none rounded-[3px]"
                    style={{ background: STATUS_META[s.status].color }}
                  />
                  <span className="flex-1 text-muted">{statusLabel(t, s.status)}</span>
                  <span className="font-mono font-semibold">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
