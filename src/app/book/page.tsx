import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { BookAppointmentForm } from "@/components/book/BookAppointmentForm";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/get-locale";
import { translate } from "@/lib/i18n/translate";

export default async function BookAppointmentPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const canAssignOthers = session.role === "team_leader" || session.role === "admin";

  const [{ data: branches }, agentsResult, locale] = await Promise.all([
    supabase.from("branches").select("id, name").order("name"),
    canAssignOthers
      ? supabase.from("profiles").select("id, full_name").neq("status", "removed").order("full_name")
      : Promise.resolve({ data: null }),
    getLocale(),
  ]);

  return (
    <AppShell
      userId={session.userId}
      role={session.role}
      userName={session.fullName}
      viewTitle={translate(locale, "nav.book")}
    >
      <BookAppointmentForm
        branches={branches ?? []}
        agents={canAssignOthers ? (agentsResult.data ?? []) : null}
        currentUserId={session.userId}
        currentUserName={session.fullName}
      />
    </AppShell>
  );
}
