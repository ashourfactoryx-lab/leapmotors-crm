import "server-only";
import { headers } from "next/headers";
import type { Role } from "@/lib/nav-items";

export type Session = {
  userId: string;
  fullName: string;
  username: string;
  role: Role;
  status: string;
};

// Returns null when signed out. The proxy (src/proxy.ts) already resolved
// the signed-in user and their profile once per request and forwarded the
// result as request headers — reading those here avoids repeating the same
// auth.getUser() + profile query on every page, which was doubling every
// navigation's round-trips to Supabase.
export async function getSession(): Promise<Session | null> {
  const headerStore = await headers();
  const userId = headerStore.get("x-user-id");
  const role = headerStore.get("x-user-role");
  const status = headerStore.get("x-user-status");
  const fullName = headerStore.get("x-user-full-name");
  const username = headerStore.get("x-user-username");
  if (!userId || !role || !status || !fullName || !username) return null;

  return { userId, fullName, username, role: role as Role, status };
}
