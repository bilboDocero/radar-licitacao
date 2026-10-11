import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { environment } from '@radar/config';
import * as schema from './schema.js';
export * from './schema.js';
export function createDatabase(url = environment().DATABASE_URL) {
  const pool = new Pool({ connectionString: url, max: 10, connectionTimeoutMillis: 5000 });
  return { db: drizzle(pool, { schema }), pool };
}
export type Database = ReturnType<typeof createDatabase>['db'];
