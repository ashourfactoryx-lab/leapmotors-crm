// Supabase Auth requires an email; agents sign in with a username instead.
// We derive a deterministic, non-deliverable email so no separate lookup
// table is needed before authentication.
const USERNAME_DOMAIN = "leapmotor.internal";

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${USERNAME_DOMAIN}`;
}
