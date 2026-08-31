import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ReportsClient } from "@/components/reports/ReportsClient";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { fetchAvailableMonths } from "@/lib/dashboard-query";
import {
  fetchReportRows,
  computeAgentPerformance,
  computeSourcePerformance,
  computeHandlerPerformance,
  computeTimeSeries,
  computeDailyBookingActivity,
} from "@/lib/reports-query";
import { fetchHandlers } from "@/lib/handlers-query";
import { dateLocaleTag } from "@/lib/i18n/locale";
import { getLocale } from "@/lib/i18n/get-locale";
import { translate } from "@/lib/i18n/translate";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const [rows, { data: profiles }, months, handlers, locale] = await Promise.all([
    fetchReportRows(supabase),
    supabase.from("profiles").select("id, full_name").eq("status", "active"),
    fetchAvailableMonths(supabase),
    fetchHandlers(supabase),
    getLocale(),
  ]);

  const agentPerformance = computeAgentPerformance(rows, profiles ?? []);
  const sourcePerformance = computeSourcePerformance(rows);
  const handlerPerformance = computeHandlerPerformance(rows, handlers);
  const timeSeries = computeTimeSeries(rows, "month", dateLocaleTag(locale));
  const dailyActivity = computeDailyBookingActivity(rows, profiles ?? [], dateLocaleTag(locale));

  return (
    <AppShell
      userId={session.userId}
      role={session.role}
      userName={session.fullName}
      viewTitle={translate(locale, "nav.reports")}
    >
      <ReportsClient
        initialAgentPerformance={agentPerformance}
        initialSourcePerformance={sourcePerformance}
        initialHandlerPerformance={handlerPerformance}
        initialTimeSeries={timeSeries}
        initialDailyActivity={dailyActivity}
        monthOptions={months}
        agents={profiles ?? []}
        handlers={handlers}
      />
    </AppShell>
  );
}
