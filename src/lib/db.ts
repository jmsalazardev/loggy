import { neon } from "@neondatabase/serverless";
import { Redis } from "@upstash/redis";

export interface LogEntry {
  id?: string | number;
  params: Record<string, string>;
  queryString: string;
  ip: string;
  userAgent: string;
  createdAt: string;
}

// Memory fallback for local development before configuring external DB
const memoryLogs: LogEntry[] = [];

/**
 * Returns a Neon SQL query executor if DATABASE_URL or POSTGRES_URL is defined.
 */
function getNeonSql() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return null;
  try {
    return neon(dbUrl);
  } catch (err) {
    console.error("[DB] Error initializing Neon client:", err);
    return null;
  }
}

let pgInitialized = false;

/**
 * Initializes table in Neon / Vercel Postgres if environment variable is present.
 */
async function initPostgresIfNeeded() {
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS url_logs (
        id SERIAL PRIMARY KEY,
        params JSONB NOT NULL,
        query_string TEXT,
        ip TEXT,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
  } catch (error) {
    console.error("[DB Init] Postgres table initialization error:", error);
  }
}

/**
 * Save URL parameter log to Database (Neon / Vercel Postgres / Vercel KV / Memory fallback)
 */
export async function saveUrlLog(entry: Omit<LogEntry, "createdAt">): Promise<LogEntry> {
  const fullEntry: LogEntry = {
    ...entry,
    createdAt: new Date().toISOString(),
  };

  let saved = false;

  // 1. Try Neon / Vercel Postgres
  const sql = getNeonSql();
  if (sql) {
    try {
      if (!pgInitialized) {
        await initPostgresIfNeeded();
        pgInitialized = true;
      }
      const paramsJson = JSON.stringify(fullEntry.params);
      const res = await sql`
        INSERT INTO url_logs (params, query_string, ip, user_agent, created_at)
        VALUES (${paramsJson}::jsonb, ${fullEntry.queryString}, ${fullEntry.ip}, ${fullEntry.userAgent}, ${fullEntry.createdAt})
        RETURNING id;
      ` as Array<{ id: number }>;

      if (res && res.length > 0) {
        fullEntry.id = res[0].id;
      }
      saved = true;
      console.log(`[DB] Saved log #${fullEntry.id} to Neon / Vercel Postgres`);
    } catch (err) {
      console.error("[DB] Error saving to Postgres:", err);
    }
  }

  // 2. Try Vercel KV / Upstash Redis
  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (kvUrl && kvToken) {
    try {
      const redis = new Redis({ url: kvUrl, token: kvToken });
      const id = Date.now().toString();
      fullEntry.id = fullEntry.id || id;
      await redis.lpush("url_logs", JSON.stringify(fullEntry));
      saved = true;
      console.log(`[DB] Saved log #${fullEntry.id} to Vercel KV`);
    } catch (err) {
      console.error("[DB] Error saving to Vercel KV:", err);
    }
  }

  // 3. Fallback to Local Memory (if no DB configured)
  if (!saved) {
    fullEntry.id = memoryLogs.length + 1;
    memoryLogs.unshift(fullEntry);
    console.log(`[DB Local Fallback] Saved log #${fullEntry.id} to Memory`);
  }

  return fullEntry;
}

/**
 * Retrieve all saved URL logs from Database
 */
export async function getUrlLogs(limit = 100): Promise<LogEntry[]> {
  // 1. Try Neon / Vercel Postgres
  const sql = getNeonSql();
  if (sql) {
    try {
      if (!pgInitialized) {
        await initPostgresIfNeeded();
        pgInitialized = true;
      }
      const rows = (await sql`
        SELECT id, params, query_string AS "queryString", ip, user_agent AS "userAgent", created_at AS "createdAt"
        FROM url_logs
        ORDER BY id DESC
        LIMIT ${limit};
      `) as Array<{
        id: number;
        params: unknown;
        queryString: string;
        ip: string;
        userAgent: string;
        createdAt: string | Date;
      }>;

      return rows.map((row) => ({
        id: row.id,
        params: typeof row.params === "string" ? JSON.parse(row.params) : (row.params as Record<string, string>),
        queryString: row.queryString,
        ip: row.ip,
        userAgent: row.userAgent,
        createdAt: new Date(row.createdAt).toISOString(),
      }));
    } catch (err) {
      console.error("[DB] Error fetching from Postgres:", err);
    }
  }

  // 2. Try Vercel KV / Upstash Redis
  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (kvUrl && kvToken) {
    try {
      const redis = new Redis({ url: kvUrl, token: kvToken });
      const rawLogs = await redis.lrange<string | LogEntry>("url_logs", 0, limit - 1);
      return rawLogs.map((item) => (typeof item === "string" ? JSON.parse(item) : item));
    } catch (err) {
      console.error("[DB] Error fetching from Vercel KV:", err);
    }
  }

  // 3. Fallback to Memory Logs
  return memoryLogs.slice(0, limit);
}
