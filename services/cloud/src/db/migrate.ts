import fs from "node:fs";
import path from "node:path";
import { getPool } from "./database.js";

const MIGRATIONS_DIR = path.resolve(process.cwd(), "src", "db", "migrations");

async function getAppliedMigrations(): Promise<Set<string>> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  const res = await pool.query<{ name: string }>("SELECT name FROM schema_migrations");
  return new Set(res.rows.map((r) => r.name));
}

async function applyMigration(name: string, sql: string): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING", [name]);
    await client.query("COMMIT");
    console.log(`✅ Applied migration: ${name}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`❌ Failed migration: ${name}`, err);
    throw err;
  } finally {
    client.release();
  }
}

export async function migrate(): Promise<void> {
  const applied = await getAppliedMigrations();

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`Skipping already applied migration: ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    await applyMigration(file, sql);
  }
}

// Only run as a CLI when invoked directly, never on import.
if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) {
  migrate().then(() => {
    console.log("All migrations applied");
    process.exit(0);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

