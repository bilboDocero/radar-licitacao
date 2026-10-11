import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { environment } from '@radar/config';
import { queues } from '@radar/events';
const connection = new Redis(environment().REDIS_URL, { maxRetriesPerRequest: null });
const queue = new Queue(queues.collection, { connection });
const events = new QueueEvents(queues.collection, { connection });
try {
  await events.waitUntilReady();
  const job = await queue.add(
    'pncp',
    {},
    {
      jobId: `pncp-manual-${Math.floor(Date.now() / 60000)}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  );
  console.log(`Coleta enfileirada: ${job.id}. O collector precisa estar em execução.`);
  console.log(await job.waitUntilFinished(events, 600000));
} finally {
  await events.close();
  await queue.close();
  await connection.quit();
}
