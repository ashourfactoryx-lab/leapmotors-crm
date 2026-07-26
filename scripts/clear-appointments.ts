// One-off: deletes all appointment data (comments, history, appointments)
// while leaving accounts and branches untouched. Run once when starting a
// fresh dataset.
//
// Usage: npx tsx scripts/clear-appointments.ts

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

const ALWAYS_TRUE_UUID_COL = "id";

async function clearTable(table: string) {
  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .not(ALWAYS_TRUE_UUID_COL, "is", null);
  if (error) throw new Error(`Failed to clear ${table}: ${error.message}`);
  console.log(`  cleared ${count ?? 0} rows from ${table}`);
}

async function main() {
  console.log("Clearing appointment data (accounts and branches are untouched)...");
  // Order matters: appt_comments and appt_history reference appointments via FK.
  await clearTable("appt_comments");
  await clearTable("appt_history");
  await clearTable("appointments");
  console.log("\nDone. Logins are unaffected — ready for a fresh import.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
