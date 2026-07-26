import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AdminPanelClient, type Account } from "@/components/admin/AdminPanelClient";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { fetchHandlers } from "@/lib/handlers-query";
import { todayISO } from "@/lib/local-date";
import { getLocale } from "@/lib/i18n/get-locale";
import { translate } from "@/lib/i18n/translate";

export default async function AdminPanelPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createClient();

  const [{ data: profiles }, { count: totalCount }, { count: todayCount }, handlers, locale] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, username, role, status, agent_code, created_at")
      .in("role", ["agent", "team_leader", "showroom"])
      .neq("status", "removed")
      .order("created_at", { ascending: true }),
    supabase.from("appointments").select("*", { count: "exact", head: true }),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("appt_date", todayISO()),
    fetchHandlers(supabase),
    getLocale(),
  ]);

  // Per-agent counts via HEAD queries (count only, no row limit) rather than
  // fetching every appointment row — PostgREST caps unbounded selects at
  // 1000 rows, which would silently undercount past that.
  const accounts: Account[] = await Promise.all(
    (profiles ?? []).map(async (p) => {
      const { count } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("assigned_agent", p.id);
      return {
        id: p.id,
        fullName: p.full_name,
        username: p.username,
        role: p.role,
        status: p.status as "active" | "suspended",
        agentCode: p.agent_code,
        apptCount: count ?? 0,
      };
    }),
  );

  return (
    <AppShell
      userId={session.userId}
      role={session.role}
      userName={session.fullName}
      viewTitle={translate(locale, "nav.admin")}
    >
      <AdminPanelClient
        accounts={accounts}
        totalAppointments={totalCount ?? 0}
        bookedToday={todayCount ?? 0}
        handlers={handlers}
      />
    </AppShell>
  );
}
