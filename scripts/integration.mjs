import { Pool } from 'pg';
import { config } from 'dotenv';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
config({ quiet: true });
const base = new URL(process.env.DATABASE_URL);
const database = `radar_test_${randomUUID().replaceAll('-', '')}`;
if (!/^radar_test_[a-f0-9]{32}$/.test(database)) throw new Error('Unsafe test database name');
const maintenance = new Pool({ connectionString: base.href });
await maintenance.query(`CREATE DATABASE "${database}"`);
base.pathname = `/${database}`;
const env = {
  ...process.env,
  DATABASE_URL: base.href,
  TEST_DATABASE_URL: base.href,
  NODE_ENV: 'test',
};
async function run(args) {
  const child = spawn(process.execPath, [process.env.npm_execpath, ...args], {
    env,
    stdio: 'inherit',
  });
  await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`Test command failed (${code})`)),
    );
  });
}
try {
  await run(['db:migrate']);
  await run(['db:seed']);
  await run(['exec', 'vitest', 'run', 'tests/integration']);
} finally {
  await maintenance.query(`DROP DATABASE "${database}" WITH (FORCE)`);
  await maintenance.end();
}
