import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MySheetGrid } from "@/components/my-sheet/MySheetGrid";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { MY_SHEET_SELECT, mapMySheetRow } from "@/lib/my-sheet-query";

export default async function MySheetPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select(MY_SHEET_SELECT)
    .eq("assigned_agent", session.userId)
    .order("appt_date", { ascending: false })
    .order("appt_time", { ascending: false, nullsFirst: false });

  const rows = (data ?? []).map(mapMySheetRow);

  return (
    <AppShell userId={session.userId} role={session.role} userName={session.fullName} viewTitle="My Sheet">
      <MySheetGrid rows={rows} userName={session.fullName} userId={session.userId} />
    </AppShell>
  );
}
