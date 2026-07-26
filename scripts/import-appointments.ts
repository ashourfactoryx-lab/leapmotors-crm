// General-purpose appointments CSV importer. Safe to re-run — rows are
// upserted by appt_code, so re-running with an updated CSV just overwrites
// matching rows instead of duplicating them.
//
// Usage: npx tsx scripts/import-appointments.ts <path-to-csv>
//
// Expected CSV columns (header row required):
//   appt_id,customer_name,phone,assigned_agent,source,appt_date,appt_time,branch,status,sale_amount,notes,booked_on
//
//   appt_id        unique code for the appointment (e.g. HAY-0001)
//   customer_name  required
//   phone          optional
//   assigned_agent agent's full name — must match a profiles.full_name in the DB
//   source         "Phone Call" | "WhatsApp" | anything else -> "other"
//   appt_date      YYYY-MM-DD, required
//   appt_time      HH:MM, optional
//   branch         must match a branches.name in the DB (falls back to the
//                  first branch found if omitted)
//   status         Scheduled | Confirmed | Attended | No Show | Rescheduled |
//                  Cancelled | Closed / Sold
//   sale_amount    optional number
//   notes          optional
//   booked_on      YYYY-MM-DD, optional — used as created_at; falls back to appt_date

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

async function loadProfileIdsByName(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from("profiles").select("id, full_name");
  if (error) throw new Error(`Failed to load profiles: ${error.message}`);
  return Object.fromEntries((data ?? []).map((p) => [p.full_name, p.id]));
}

async function loadBranchIdsByName(): Promise<{ byName: Record<string, string>; fallback: string | null }> {
  const { data, error } = await supabase.from("branches").select("id, name");
  if (error) throw new Error(`Failed to load branches: ${error.message}`);
  const byName = Object.fromEntries((data ?? []).map((b) => [b.name, b.id]));
  return { byName, fallback: data?.[0]?.id ?? null };
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
  const csvPath = process.argv[2];
  if (!csvPath) {
    throw new Error("Usage: npx tsx scripts/import-appointments.ts <path-to-csv>");
  }

  console.log("Loading agents and branches...");
  const profileIdByName = await loadProfileIdsByName();
  const { byName: branchIdByName, fallback: fallbackBranchId } = await loadBranchIdsByName();

  console.log(`Parsing ${csvPath}...`);
  const rows = parseCsv(resolve(csvPath));
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
    const branchId = (row.branch && branchIdByName[row.branch]) || fallbackBranchId;
    if (!branchId) {
      throw new Error(`No branch found for appt ${row.appt_id} (branch "${row.branch}" not in DB, and no fallback)`);
    }
    if (!row.appt_date) {
      throw new Error(`Missing appt_date for appt ${row.appt_id}`);
    }

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
      created_at: `${row.booked_on || row.appt_date}T00:00:00Z`,
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

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
