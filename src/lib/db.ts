// ============================================================================
// PostgreSQL Database Persistence Layer for CashFromChaos
// ----------------------------------------------------------------------------
// Connects to existing PostgreSQL server (default: shared-pg docker or local).
// Provides write-through persistence and startup hydration for items and state.
// Falls back gracefully to in-memory if DB is unreachable or CFC_DB=off.
// ============================================================================

import { Pool, PoolConfig } from "pg";
import type { Item } from "@/lib/types";

let pool: Pool | null = null;
let initialized = false;

export function getPgPool(): Pool | null {
  if (
    typeof jest !== "undefined" ||
    process.env.NODE_ENV === "test" ||
    process.env.JEST_WORKER_ID !== undefined ||
    process.env.CFC_DB === "off"
  ) {
    return null;
  }
  if (!pool) {
    const config: PoolConfig = {
      connectionString:
        process.env.DATABASE_URL ||
        "postgres://pgadmin:81914287fd58ccba48967c0b8483dfc74cced7f28c14d196@127.0.0.1:5432/cashfromchaos",
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000,
    };
    pool = new Pool(config);
    pool.on("error", (err) => {
      console.warn("[PostgreSQL] Pool error, continuing with in-memory fallback:", err.message);
    });
  }
  return pool;
}

export async function initDb(): Promise<boolean> {
  const p = getPgPool();
  if (!p) return false;
  if (initialized) return true;

  try {
    const client = await p.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS items (
          id VARCHAR(128) PRIMARY KEY,
          created_at BIGINT NOT NULL,
          status VARCHAR(64) NOT NULL,
          data JSONB NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_items_created_at ON items (created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_items_status ON items (status);
      `);
      initialized = true;
      return true;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[PostgreSQL] Could not initialize tables (using in-memory fallback):", msg);
    return false;
  }
}

export async function loadItemsFromDb(): Promise<Item[] | null> {
  const p = getPgPool();
  if (!p) return null;

  try {
    const ok = await initDb();
    if (!ok) return null;
    const res = await p.query("SELECT data FROM items ORDER BY created_at DESC");
    return res.rows.map((r) => r.data as Item);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[PostgreSQL] Error loading items:", msg);
    return null;
  }
}

export async function persistItemToDb(item: Item): Promise<void> {
  const p = getPgPool();
  if (!p) return;

  try {
    const ok = await initDb();
    if (!ok) return;
    await p.query(
      `INSERT INTO items (id, created_at, status, data, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         data = EXCLUDED.data,
         updated_at = CURRENT_TIMESTAMP`,
      [item.id, item.createdAt, item.status, JSON.stringify(item)]
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[PostgreSQL] Error persisting item:", msg);
  }
}

export async function clearItemsInDb(): Promise<void> {
  const p = getPgPool();
  if (!p) return;

  try {
    const ok = await initDb();
    if (!ok) return;
    await p.query("TRUNCATE TABLE items");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[PostgreSQL] Error clearing items in DB:", msg);
  }
}
