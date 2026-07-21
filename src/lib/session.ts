import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/nav-items";

export type Session = {
  userId: string;
  fullName: string;
  username: string;
  role: Role;
  status: string;
};

// Returns null when signed out. Middleware already guards page routes, so
// pages can treat a null session as "shouldn't happen" rather than re-check.
export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username, role, status")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  return {
    userId: user.id,
    fullName: profile.full_name,
    username: profile.username,
    role: profile.role,
    status: profile.status,
  };
}
