import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { eq, isNull, asc } from 'drizzle-orm';
import { environment, logger, startTelemetry } from '@radar/config';
import { createDatabase, outboxEvents } from '@radar/database';
import { queues } from '@radar/events';
import { processEvent } from './processor.js';
await startTelemetry('radar-worker');
const { db, pool } = createDatabase();
const connection = new Redis(environment().REDIS_URL, { maxRetriesPerRequest: null });
const queue = new Queue(queues.matching, { connection });
const worker = new Worker(queues.matching, (job) => processEvent(db, job.data), {
  connection,
  concurrency: 2,
});
worker.on('failed', (job, error) =>
  logger.error({ jobId: job?.id, err: error }, 'Matching falhou'),
);
let publishing = false;
const timer = setInterval(async () => {
  if (publishing) return;
  publishing = true;
  try {
    const events = await db
      .select()
      .from(outboxEvents)
      .where(isNull(outboxEvents.dispatchedAt))
      .orderBy(asc(outboxEvents.createdAt))
      .limit(100);
    for (const event of events) {
      await queue.add(event.type, event.payload, {
        jobId: event.id,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 604800 },
        removeOnFail: false,
      });
      await db
        .update(outboxEvents)
        .set({ dispatchedAt: new Date() })
        .where(eq(outboxEvents.id, event.id));
    }
  } catch (error) {
    logger.error({ err: error }, 'Publicação da outbox falhou');
  } finally {
    publishing = false;
  }
}, 2000);
logger.info('Worker de matching e notificações iniciado');
async function close() {
  clearInterval(timer);
  while (publishing) await new Promise((resolve) => setTimeout(resolve, 50));
  await worker.close();
  await queue.close();
  await connection.quit();
  await pool.end();
}
process.on('SIGTERM', close);
process.on('SIGINT', close);
