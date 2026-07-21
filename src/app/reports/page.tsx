import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PlaceholderView } from "@/components/layout/PlaceholderView";
import { getSession } from "@/lib/session";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <AppShell userId={session.userId} role={session.role} userName={session.fullName} viewTitle="Reports">
      <PlaceholderView note="Appointments by day/month, agent performance, sales, attendance, and source reports arrive in Milestone 8." />
    </AppShell>
  );
}
