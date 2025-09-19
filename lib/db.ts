import { Pool, type PoolClient, type QueryResult } from 'pg';
import { getEnv } from './env';

let pool: Pool | null = null;

function createPool() {
  const { DATABASE_URL } = getEnv();

  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured. Set it in your environment variables.');
  }

  const shouldUseSsl = process.env.DATABASE_SSL !== 'false';

  return new Pool({
    connectionString: DATABASE_URL,
    ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined
  });
}

export function getPool() {
  if (!pool) {
    pool = createPool();
  }

  return pool;
}

export async function query<T = unknown>(text: string, params: unknown[] = []) {
  const result: QueryResult<T> = await getPool().query(text, params);
  return result;
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
