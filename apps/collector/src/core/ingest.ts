import { and, eq, sql } from 'drizzle-orm';
import {
  procurements,
  procurementVersions,
  rawSourceRecords,
  outboxEvents,
  type Database,
} from '@radar/database';
import { stableHash, type RawSourceRecord } from '@radar/source-sdk';
import type { CanonicalProcurement } from '@radar/contracts';
export async function ingest(
  db: Database,
  sourceId: string,
  runId: string,
  raw: RawSourceRecord,
  canonical: CanonicalProcurement,
) {
  const hash = stableHash(canonical);
  const rawHash = stableHash(raw.payload);
  return db.transaction(async (tx) => {
    // Transaction-scoped advisory lock serializes replays and concurrent copies of one public record.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${sourceId + ':' + canonical.externalId}))`,
    );
    const [rawInserted] = await tx
      .insert(rawSourceRecords)
      .values({ sourceId, runId, externalId: raw.externalId, hash: rawHash, payload: raw.payload })
      .onConflictDoNothing()
      .returning();
    const rawRow =
      rawInserted ||
      (await tx.query.rawSourceRecords.findFirst({
        where: and(
          eq(rawSourceRecords.sourceId, sourceId),
          eq(rawSourceRecords.externalId, raw.externalId),
          eq(rawSourceRecords.hash, rawHash),
        ),
      }));
    const existing = await tx.query.procurements.findFirst({
      where: and(
        eq(procurements.sourceId, sourceId),
        eq(procurements.externalId, canonical.externalId),
      ),
    });
    if (
      existing?.hash === hash ||
      (existing && existing.sourceUpdatedAt > new Date(canonical.sourceUpdatedAt))
    )
      return { changed: false, id: existing.id };
    const values = {
      ...canonical,
      sourceId,
      hash,
      publishedAt: new Date(canonical.publishedAt),
      deadline: canonical.deadline ? new Date(canonical.deadline) : null,
      sourceUpdatedAt: new Date(canonical.sourceUpdatedAt),
      version: (existing?.version || 0) + 1,
      updatedAt: new Date(),
    };
    const [record] = existing
      ? await tx
          .update(procurements)
          .set(values)
          .where(eq(procurements.id, existing.id))
          .returning()
      : await tx.insert(procurements).values(values).returning();
    await tx
      .insert(procurementVersions)
      .values({
        procurementId: record!.id,
        rawRecordId: rawRow!.id,
        version: record!.version,
        snapshot: canonical,
      });
    await tx
      .insert(outboxEvents)
      .values({
        type: 'procurement.changed',
        payload: { type: 'procurement.changed', procurementId: record!.id },
      });
    return { changed: true, id: record!.id };
  });
}
