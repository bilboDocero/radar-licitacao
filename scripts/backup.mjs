import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
await mkdir('.local/backups', { recursive: true });
const path = `.local/backups/radar-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`;
const child = spawn(
  'docker',
  ['compose', 'exec', '-T', 'postgres', 'pg_dump', '-U', 'radar', '-d', 'radar', '-Fc'],
  { stdio: ['ignore', 'pipe', 'inherit'] },
);
const exited = new Promise((resolve, reject) => {
  child.on('error', reject);
  child.on('exit', (code) =>
    code === 0 ? resolve() : reject(new Error(`pg_dump exited ${code}`)),
  );
});
await Promise.all([pipeline(child.stdout, createWriteStream(path)), exited]);
console.log(`Backup salvo: ${path}`);
