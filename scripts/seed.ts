// Repeatable seed script: creates the demo accounts + branch, then imports
// appointments_seed.csv. Safe to re-run — accounts and appointments (matched
// by username / appt_code) are skipped or upserted rather than duplicated.
//
// Usage: npm run seed

import { config } from "dotenv";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import Papa from "papaparse";
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

const BRANCH_NAME = "Main Showroom";

type Role = "agent" | "team_leader" | "admin";

type SeedAccount = {
  username: string;
  fullName: string;
  role: Role;
  agentCode: string | null;
  password: string;
};

const SEED_ACCOUNTS: SeedAccount[] = [
  { username: "admin", fullName: "Administrator", role: "admin", agentCode: null, password: "leap-admin" },
  { username: "lead", fullName: "Team Leader", role: "team_leader", agentCode: null, password: "leap2026" },
  { username: "haya", fullName: "Haya", role: "agent", agentCode: "HAY", password: "leap2026" },
  { username: "rawand", fullName: "Rawand", role: "agent", agentCode: "RAW", password: "leap2026" },
  { username: "eman", fullName: "Eman", role: "agent", agentCode: "EMA", password: "leap2026" },
  { username: "suad", fullName: "Su'ad", role: "agent", agentCode: "SUA", password: "leap2026" },
  { username: "kanar", fullName: "Kanar", role: "agent", agentCode: "KAN", password: "leap2026" },
  { username: "salma", fullName: "Salma", role: "agent", agentCode: "AG7", password: "leap2026" },
  { username: "mariam", fullName: "Mariam", role: "agent", agentCode: "MAR", password: "leap2026" },
  { username: "ghazal", fullName: "Ghazal", role: "agent", agentCode: "GHA", password: "leap2026" },
];

const STATUS_MAP: Record<string, string> = {
  Scheduled: "scheduled",
  Confirmed: "confirmed",
  Attended: "attended",
  "No Show": "no_show",
  Rescheduled: "rescheduled",
  Cancelled: "cancelled",
  "Closed / Sold": "closed_sold",
};

const SOURCE_MAP: Record<string, string> = {
  "Phone Call": "phone_call",
  WhatsApp: "whatsapp",
};

type CsvRow = {
  appt_id: string;
  customer_name: string;
  phone: string;
  assigned_agent: string;
  source: string;
  appt_date: string;
  appt_time: string;
  branch: string;
  status: string;
  sale_amount: string;
  notes: string;
  booked_on: string;
};

async function ensureAccount(acct: SeedAccount): Promise<string> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, full_name, role, agent_code")
    .eq("username", acct.username)
    .maybeSingle();

  if (existing) {
    const drifted =
      existing.full_name !== acct.fullName ||
      existing.role !== acct.role ||
      existing.agent_code !== acct.agentCode;
    if (drifted) {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: acct.fullName, role: acct.role, agent_code: acct.agentCode })
        .eq("id", existing.id);
      if (error) throw new Error(`Failed to update profile for ${acct.username}: ${error.message}`);
      console.log(`~ updated ${acct.username} (${acct.role})`);
    } else {
      console.log(`= ${acct.username} already up to date, skipping`);
    }
    return existing.id;
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
    role: acct.role,
    agent_code: acct.agentCode,
  });
  if (profileError) {
    throw new Error(`Failed to create profile for ${acct.username}: ${profileError.message}`);
  }

  console.log(`+ created ${acct.username} (${acct.role})`);
  return created.user.id;
}

async function ensureBranch(name: string): Promise<string> {
  const { data: existing } = await supabase.from("branches").select("id").eq("name", name).maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("branches")
    .insert({ name })
    .select("id")
    .single();
  if (error || !created) throw new Error(`Failed to create branch ${name}: ${error?.message}`);

  console.log(`+ created branch ${name}`);
  return created.id;
}

function parseCsv(path: string): CsvRow[] {
  const raw = readFileSync(path, "utf-8");
  const { data, errors } = Papa.parse<CsvRow>(raw, { header: true, skipEmptyLines: true });
  if (errors.length) {
    throw new Error(`CSV parse errors: ${JSON.stringify(errors.slice(0, 3))}`);
  }
  return data;
}

async function main() {
  console.log("Seeding accounts...");
  const profileIdByName: Record<string, string> = {};
  for (const acct of SEED_ACCOUNTS) {
    profileIdByName[acct.fullName] = await ensureAccount(acct);
  }

  console.log("Seeding branch...");
  const branchId = await ensureBranch(BRANCH_NAME);

  console.log("Parsing appointments_seed.csv...");
  const rows = parseCsv(resolve(process.cwd(), "appointments_seed.csv"));
  console.log(`Found ${rows.length} rows`);

  const appointments = rows.map((row) => {
    const assignedId = profileIdByName[row.assigned_agent];
    if (!assignedId) {
      throw new Error(`Unknown agent "${row.assigned_agent}" for appt ${row.appt_id}`);
    }
    const status = STATUS_MAP[row.status];
    if (!status) {
      throw new Error(`Unknown status "${row.status}" for appt ${row.appt_id}`);
    }
    const source = SOURCE_MAP[row.source] ?? "other";

    return {
      appt_code: row.appt_id,
      customer_name: row.customer_name,
      phone: row.phone || null,
      assigned_agent: assignedId,
      branch_id: branchId,
      source,
      appt_date: row.appt_date,
      appt_time: row.appt_time || null,
      status,
      sale_amount: row.sale_amount ? Number(row.sale_amount) : null,
      notes: row.notes || null,
      created_by: assignedId,
      created_at: row.booked_on ? `${row.booked_on}T00:00:00Z` : undefined,
    };
  });

  console.log("Importing appointments (upsert on appt_code)...");
  const CHUNK = 200;
  let imported = 0;
  for (let i = 0; i < appointments.length; i += CHUNK) {
    const chunk = appointments.slice(i, i + CHUNK);
    const { error } = await supabase.from("appointments").upsert(chunk, { onConflict: "appt_code" });
    if (error) throw new Error(`Failed to import chunk starting at row ${i}: ${error.message}`);
    imported += chunk.length;
    console.log(`  ${imported}/${appointments.length}`);
  }

  console.log("\nDone. Demo credentials:");
  for (const acct of SEED_ACCOUNTS) {
    console.log(`  ${acct.username.padEnd(8)} / ${acct.password}   (${acct.role})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
