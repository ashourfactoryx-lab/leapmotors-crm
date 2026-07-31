// One-time import of the cleaned April/May historical CSV (produced by the
// data-cleaning pass — see leapmotor_april_may_cleaned.csv). Appt codes are
// NOT in the CSV; the DB trigger assigns the next sequential code per agent
// on insert. NOT safe to re-run — running twice would create duplicates.
//
// Usage: npx tsx scripts/import-historical.ts [path-to-csv]

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

const BRANCH_NAME = "Main Showroom";

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
  customer_name: string;
  phone: string;
  agent: string;
  source: string;
  appt_date: string;
  appt_time: string;
  branch: string;
  status: string;
  sale_amount: string;
  notes: string;
  booked_on: string;
};

async function loadProfileIdsByName(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from("profiles").select("id, full_name");
  if (error) throw new Error(`Failed to load profiles: ${error.message}`);
  return Object.fromEntries((data ?? []).map((p) => [p.full_name, p.id]));
}

async function loadBranchId(): Promise<string> {
  const { data, error } = await supabase.from("branches").select("id").eq("name", BRANCH_NAME).single();
  if (error || !data) throw new Error(`Branch "${BRANCH_NAME}" not found — run npm run seed first`);
  return data.id;
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
  const csvPath = process.argv[2] ?? resolve(process.env.HOME!, "Downloads/leapmotor_april_may_cleaned.csv");
  console.log(`Reading ${csvPath}...`);

  const profileIds = await loadProfileIdsByName();
  const branchId = await loadBranchId();
  const rows = parseCsv(csvPath);
  console.log(`Found ${rows.length} rows`);

  const appointments = rows.map((row) => {
    const assignedId = profileIds[row.agent];
    if (!assignedId) throw new Error(`Unknown agent "${row.agent}" for customer "${row.customer_name}"`);
    const status = STATUS_MAP[row.status];
    if (!status) throw new Error(`Unknown status "${row.status}" for customer "${row.customer_name}"`);
    const source = SOURCE_MAP[row.source] ?? "other";
    if (!row.appt_date) throw new Error(`Missing appt_date for customer "${row.customer_name}"`);

    return {
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
      created_at: `${row.booked_on || row.appt_date}T00:00:00Z`,
    };
  });

  console.log(`\nImporting ${appointments.length} appointments (fresh appt_codes, no upsert)...`);
  const CHUNK = 100;
  let imported = 0;
  for (let i = 0; i < appointments.length; i += CHUNK) {
    const chunk = appointments.slice(i, i + CHUNK);
    const { error } = await supabase.from("appointments").insert(chunk);
    if (error) throw new Error(`Failed to import chunk starting at row ${i}: ${error.message}`);
    imported += chunk.length;
    console.log(`  ${imported}/${appointments.length}`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
