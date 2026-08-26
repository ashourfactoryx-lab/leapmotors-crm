import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { fetchAllAppointmentAgentStatus, computeDashboardStats, fetchAvailableMonths } from "@/lib/dashboard-query";
import { getLocale } from "@/lib/i18n/get-locale";
import { translate } from "@/lib/i18n/translate";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const [rows, { data: profiles }, months, locale] = await Promise.all([
    fetchAllAppointmentAgentStatus(supabase),
    supabase.from("profiles").select("id, full_name").eq("status", "active").eq("role", "agent"),
    fetchAvailableMonths(supabase),
    getLocale(),
  ]);

  const stats = computeDashboardStats(rows, profiles ?? []);

  return (
    <AppShell
      userId={session.userId}
      role={session.role}
      userName={session.fullName}
      viewTitle={translate(locale, "nav.dash")}
    >
      <DashboardClient initialStats={stats} monthOptions={months} />
    </AppShell>
  );
}
