import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { DailyScheduleClient } from "@/components/schedule/DailyScheduleClient";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { SCHEDULE_SELECT, mapScheduleRow, type ScheduleRow } from "@/lib/schedule-query";
import { fetchHandlers } from "@/lib/handlers-query";
import { todayISO } from "@/lib/local-date";
import { getLocale } from "@/lib/i18n/get-locale";
import { translate } from "@/lib/i18n/translate";

export default async function DailySchedulePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const today = todayISO();
  const supabase = await createClient();
  const [{ data }, handlers, locale] = await Promise.all([
    supabase.from("appointments").select(SCHEDULE_SELECT).eq("appt_date", today),
    fetchHandlers(supabase),
    getLocale(),
  ]);

  const rows: ScheduleRow[] = (data ?? []).map(mapScheduleRow);

  return (
    <AppShell
      userId={session.userId}
      role={session.role}
      userName={session.fullName}
      viewTitle={translate(locale, "nav.daily")}
    >
      <DailyScheduleClient initialDate={today} initialRows={rows} handlers={handlers} />
    </AppShell>
  );
}
