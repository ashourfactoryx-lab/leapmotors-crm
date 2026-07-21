import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { DailyScheduleClient } from "@/components/schedule/DailyScheduleClient";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { SCHEDULE_SELECT, mapScheduleRow, type ScheduleRow } from "@/lib/schedule-query";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default async function DailySchedulePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const today = todayISO();
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select(SCHEDULE_SELECT)
    .eq("appt_date", today);

  const rows: ScheduleRow[] = (data ?? []).map(mapScheduleRow);

  return (
    <AppShell userId={session.userId} role={session.role} userName={session.fullName} viewTitle="Daily Schedule">
      <DailyScheduleClient initialDate={today} initialRows={rows} />
    </AppShell>
  );
}
