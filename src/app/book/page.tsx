import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PlaceholderView } from "@/components/layout/PlaceholderView";
import { getSession } from "@/lib/session";

export default async function BookAppointmentPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <AppShell userId={session.userId} role={session.role} userName={session.fullName} viewTitle="Book Appointment">
      <PlaceholderView note="The appointment creation form with auto-generated appt codes is coming soon." />
    </AppShell>
  );
}
