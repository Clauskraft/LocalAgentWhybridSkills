import pg from "pg";

const { Pool } = pg;

// ============================================================================
// DATABASE CONNECTION (PostgreSQL)
// Connects to Railway PostgreSQL or local instance
// ============================================================================

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is required");
    }

    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on("error", (err) => {
      console.error("Unexpected database error:", err);
    });
  }

  return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string, 
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const pool = getPool();
  return pool.query<T>(text, params);
}

export async function getClient(): Promise<pg.PoolClient> {
  const pool = getPool();
  return pool.connect();
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// ============================================================================
// READINESS / CONNECTION CHECK
// ============================================================================

export async function initializeDatabase(): Promise<void> {
  // NOTE: Schema is managed via SQL migrations (see src/db/migrations).
  // This function is intentionally a lightweight connectivity check.
  const pool = getPool();
  await pool.query("SELECT 1");
}

