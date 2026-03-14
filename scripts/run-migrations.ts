/**
 * Run SQL migrations against a remote Supabase project.
 *
 * Uses the Supabase Management API (pg-meta) to execute raw SQL.
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in app/.env.
 *
 * Usage:
 *   npx tsx scripts/run-migrations.ts
 *   npx tsx scripts/run-migrations.ts 004   # run only migration 004+
 */

import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

// ── Load env ──────────────────────────────────────────────

const envPath = resolve(__dirname, "../app/.env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  console.error(`Could not read ${envPath}`);
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Extract project ref from URL: https://<ref>.supabase.co
const refMatch = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!refMatch) {
  console.error("Could not extract project ref from SUPABASE_URL:", SUPABASE_URL);
  process.exit(1);
}

// ── SQL executor via PostgREST RPC ────────────────────────

async function executeSql(sql: string): Promise<void> {
  // Use the Supabase SQL endpoint (pg-meta)
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: "return=minimal",
    },
    // This won't work via PostgREST — we need a different approach
  });

  // Fallback: create an exec_sql function first, then use it
  // This is the bootstrap approach
  void response;
}

/**
 * Bootstrap: create a temporary exec_sql function via PostgREST,
 * then use it to run migrations.
 */
async function bootstrapExecFunction(): Promise<boolean> {
  // Try calling exec_sql to see if it exists
  const testRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: "SELECT 1" }),
  });

  if (testRes.ok) return true;

  // If it doesn't exist, we can't create it via REST API alone
  // Fall back to using the Supabase client insert approach
  return false;
}

/**
 * Execute SQL by splitting into statements and running them
 * through individual PostgREST calls where possible,
 * or by using the exec_sql RPC if available.
 */
async function runSqlViaRpc(sql: string, filename: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Migration ${filename} failed: ${res.status} ${body}`);
  }
}

// ── Main ──────────────────────────────────────────────────

async function main() {
  const migrationsDir = resolve(__dirname, "../supabase/migrations");
  const startFrom = process.argv[2] || "001";

  // List migration files in order
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .filter((f) => f >= startFrom);

  if (files.length === 0) {
    console.log("No migration files to run.");
    return;
  }

  console.log(`Found ${files.length} migration(s) to run (from ${startFrom}):`);
  files.forEach((f) => console.log(`  - ${f}`));

  // Check if exec_sql function exists
  const hasExecFn = await bootstrapExecFunction();

  if (!hasExecFn) {
    console.error("\n[ERROR] The exec_sql function does not exist on your Supabase project.");
    console.error("Please create it by running this SQL in the Supabase SQL Editor:\n");
    console.error(`  CREATE OR REPLACE FUNCTION exec_sql(query TEXT)`);
    console.error(`  RETURNS VOID AS $$`);
    console.error(`  BEGIN`);
    console.error(`    EXECUTE query;`);
    console.error(`  END;`);
    console.error(`  $$ LANGUAGE plpgsql SECURITY DEFINER;\n`);
    console.error("Then re-run this script.");

    // Also output the migration SQL for manual execution
    console.log("\n--- Alternatively, run these migrations manually in SQL Editor ---\n");
    for (const file of files) {
      const sql = readFileSync(resolve(migrationsDir, file), "utf-8");
      console.log(`-- === ${file} ===`);
      console.log(sql);
      console.log("");
    }
    process.exit(1);
  }

  // Run each migration
  for (const file of files) {
    console.log(`\nRunning ${file}...`);
    const sql = readFileSync(resolve(migrationsDir, file), "utf-8");

    try {
      await runSqlViaRpc(sql, file);
      console.log(`  ✓ ${file} applied successfully`);
    } catch (err) {
      console.error(`  ✗ ${file} failed:`, (err as Error).message);
      process.exit(1);
    }
  }

  console.log("\n✓ All migrations applied successfully!");
}

void main();
