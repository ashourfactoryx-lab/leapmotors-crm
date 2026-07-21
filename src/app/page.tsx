import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { fetchAllAppointmentAgentStatus, computeDashboardStats, fetchAvailableMonths } from "@/lib/dashboard-query";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const [rows, { data: profiles }, months] = await Promise.all([
    fetchAllAppointmentAgentStatus(supabase),
    supabase.from("profiles").select("id, full_name"),
    fetchAvailableMonths(supabase),
  ]);

  const stats = computeDashboardStats(rows, profiles ?? []);

  return (
    <AppShell userId={session.userId} role={session.role} userName={session.fullName} viewTitle="Dashboard">
      <DashboardClient initialStats={stats} monthOptions={months} />
    </AppShell>
  );
}
