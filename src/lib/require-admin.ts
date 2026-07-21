import "server-only";
import { getSession, type Session } from "@/lib/session";

// Server Actions are reachable independent of page navigation, so the
// middleware's /admin route gate isn't enough — every privileged action
// re-checks the caller's real role here before touching the service-role
// client.
export async function requireAdmin(): Promise<Session> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    throw new Error("Admin access required");
  }
  return session;
}
