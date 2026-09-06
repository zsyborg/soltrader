import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | undefined;

export function getPostgresPool(databaseUrl = process.env.DATABASE_URL): pg.Pool {
  if (!databaseUrl) throw new Error("Missing required environment variable: DATABASE_URL");
  pool ??= new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  return pool;
}

export async function checkPostgres(databaseUrl?: string): Promise<void> {
  const client = await getPostgresPool(databaseUrl).connect();
  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
}

export async function closePostgres(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
