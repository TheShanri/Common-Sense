import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { getEnv } from './env';

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: Pool | undefined;
}

const globalForDb = globalThis as typeof globalThis & {
  __dbPool?: Pool;
};

function parseNumericEnv(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createPool() {
  const { DATABASE_URL } = getEnv();

  const shouldUseSsl = process.env.DATABASE_SSL !== 'false';
  const maxConnections = parseNumericEnv(process.env.DATABASE_POOL_MAX, 5);
  const idleTimeoutMillis = parseNumericEnv(process.env.DATABASE_IDLE_TIMEOUT, 30_000);
  const connectionTimeoutMillis = parseNumericEnv(process.env.DATABASE_CONNECTION_TIMEOUT, 10_000);

  return new Pool({
    connectionString: DATABASE_URL,
    ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
    max: maxConnections,
    idleTimeoutMillis,
    connectionTimeoutMillis,
    keepAlive: true
  });
}

export function getPool() {
  if (!globalForDb.__dbPool) {
    globalForDb.__dbPool = createPool();
  }

  return globalForDb.__dbPool;
}

export function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  return getPool().query<T>(text, params as unknown[]);
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
