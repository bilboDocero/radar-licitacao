import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { environment, logger, startTelemetry } from '@radar/config';
import { createDatabase } from '@radar/database';
import { queues } from '@radar/events';
import { collectPncp } from './core/collect.js';
await startTelemetry('radar-collector');
const env = environment();
const { db, pool } = createDatabase();
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const queue = new Queue(queues.collection, { connection });
const worker = new Worker(queues.collection, async () => collectPncp(db), {
  connection,
  concurrency: 1,
  limiter: { max: 1, duration: 60000 },
});
if (env.COLLECTION_ENABLED)
  await queue.upsertJobScheduler(
    'pncp-hourly',
    { every: env.COLLECTION_INTERVAL_MS },
    {
      name: 'pncp',
      data: {},
      opts: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    },
  );
else await queue.removeJobScheduler('pncp-hourly');
worker.on('failed', (job, error) => logger.error({ jobId: job?.id, err: error }, 'Coleta falhou'));
logger.info({ scheduled: env.COLLECTION_ENABLED }, 'Collector aguardando jobs');
async function close() {
  await worker.close();
  await queue.close();
  await connection.quit();
  await pool.end();
}
process.on('SIGTERM', close);
process.on('SIGINT', close);
