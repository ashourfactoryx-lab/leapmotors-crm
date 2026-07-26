import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AllAppointmentsClient } from "@/components/appointments/AllAppointmentsClient";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { fetchAllAppointments } from "@/lib/all-appointments-query";
import { fetchHandlers } from "@/lib/handlers-query";
import { getLocale } from "@/lib/i18n/get-locale";
import { translate } from "@/lib/i18n/translate";

export default async function AllAppointmentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const [{ rows, count }, { data: agents }, handlers, locale] = await Promise.all([
    fetchAllAppointments(supabase, { search: "", agentId: "all", handlerId: "all", page: 0 }),
    supabase.from("profiles").select("id, full_name").order("full_name"),
    fetchHandlers(supabase),
    getLocale(),
  ]);

  return (
    <AppShell
      userId={session.userId}
      role={session.role}
      userName={session.fullName}
      viewTitle={translate(locale, "nav.all")}
    >
      <AllAppointmentsClient initialRows={rows} initialCount={count} agents={agents ?? []} handlers={handlers} />
    </AppShell>
  );
}
