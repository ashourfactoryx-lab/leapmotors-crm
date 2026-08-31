import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MySheetGrid } from "@/components/my-sheet/MySheetGrid";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { MY_SHEET_SELECT, mapMySheetRow } from "@/lib/my-sheet-query";
import { fetchHandlers } from "@/lib/handlers-query";
import { getLocale } from "@/lib/i18n/get-locale";
import { translate } from "@/lib/i18n/translate";

export default async function MySheetPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const [{ data }, handlers, locale] = await Promise.all([
    supabase
      .from("appointments")
      .select(MY_SHEET_SELECT)
      .eq("assigned_agent", session.userId)
      .order("appt_code", { ascending: true }),
    fetchHandlers(supabase),
    getLocale(),
  ]);

  const rows = (data ?? []).map(mapMySheetRow);

  return (
    <AppShell
      userId={session.userId}
      role={session.role}
      userName={session.fullName}
      viewTitle={translate(locale, "nav.mine")}
      fullWidth
    >
      <MySheetGrid
        rows={rows}
        handlers={handlers}
        userName={session.fullName}
        userId={session.userId}
        role={session.role}
      />
    </AppShell>
  );
}
