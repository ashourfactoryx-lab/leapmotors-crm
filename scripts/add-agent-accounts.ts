// One-off: creates agent accounts discovered in historical CSV data that
// aren't part of the original seed roster. Safe to re-run — skips accounts
// that already exist by username.
//
// Usage: npx tsx scripts/add-agent-accounts.ts

import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERNAME_DOMAIN = "leapmotor.internal";
const usernameToEmail = (username: string) => `${username.trim().toLowerCase()}@${USERNAME_DOMAIN}`;

const NEW_ACCOUNTS = [
  { username: "mariam", fullName: "Mariam", agentCode: "MAR", password: "leap2026" },
  { username: "ghazal", fullName: "Ghazal", agentCode: "GHA", password: "leap2026" },
];

async function main() {
  for (const acct of NEW_ACCOUNTS) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", acct.username)
      .maybeSingle();
    if (existing) {
      console.log(`= ${acct.username} already exists, skipping`);
      continue;
    }

    const { data: created, error } = await supabase.auth.admin.createUser({
      email: usernameToEmail(acct.username),
      password: acct.password,
      email_confirm: true,
    });
    if (error || !created.user) {
      throw new Error(`Failed to create auth user for ${acct.username}: ${error?.message}`);
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: created.user.id,
      full_name: acct.fullName,
      username: acct.username,
      role: "agent",
      agent_code: acct.agentCode,
    });
    if (profileError) {
      throw new Error(`Failed to create profile for ${acct.username}: ${profileError.message}`);
    }

    console.log(`+ created ${acct.username} (agent)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
