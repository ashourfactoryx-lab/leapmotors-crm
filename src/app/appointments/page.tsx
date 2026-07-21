import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PlaceholderView } from "@/components/layout/PlaceholderView";
import { getSession } from "@/lib/session";

export default async function AllAppointmentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <AppShell userId={session.userId} role={session.role} userName={session.fullName} viewTitle="All Appointments">
      <PlaceholderView note="Search, agent filter, and server-side pagination across every appointment arrive in Milestone 7." />
    </AppShell>
  );
}
