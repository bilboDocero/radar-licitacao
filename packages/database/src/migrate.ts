import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import { createDatabase } from './index.js';
const { db, pool } = createDatabase();
try {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)) });
  console.log('Migrations aplicadas.');
} finally {
  await pool.end();
}
