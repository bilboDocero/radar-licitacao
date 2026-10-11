import { eq } from 'drizzle-orm';
import { collectionRuns, dataSources, type Database } from '@radar/database';
import { environment, logger } from '@radar/config';
import { PncpConnector } from '../connectors/pncp/pncp.connector.js';
import { normalizePncp } from '../normalizers/pncp.js';
import { ingest } from './ingest.js';
export async function collectPncp(db: Database) {
  const source = await db.query.dataSources.findFirst({ where: eq(dataSources.id, 'pncp') });
  if (!source || source.status !== 'approved')
    throw new Error('Execute os seeds e homologue a fonte');
  const until = new Date();
  const since = new Date(
    source.cursor
      ? source.cursor.getTime() - 86400000
      : until.getTime() - environment().PNCP_LOOKBACK_DAYS * 86400000,
  );
  const [run] = await db
    .insert(collectionRuns)
    .values({ sourceId: 'pncp', status: 'running' })
    .returning();
  let records = 0;
  try {
    for await (const raw of new PncpConnector().collect({ since, until })) {
      await ingest(db, 'pncp', run!.id, raw, normalizePncp(raw.payload));
      records++;
    }
    await db.transaction(async (tx) => {
      await tx
        .update(collectionRuns)
        .set({ status: 'completed', records, finishedAt: new Date() })
        .where(eq(collectionRuns.id, run!.id));
      await tx.update(dataSources).set({ cursor: until }).where(eq(dataSources.id, 'pncp'));
    });
    logger.info({ records, runId: run!.id }, 'Coleta PNCP concluída');
    return { records, runId: run!.id };
  } catch (error) {
    await db
      .update(collectionRuns)
      .set({
        status: 'failed',
        records,
        error: error instanceof Error ? error.message.slice(0, 1000) : 'Erro de coleta',
        finishedAt: new Date(),
      })
      .where(eq(collectionRuns.id, run!.id));
    throw error;
  }
}
