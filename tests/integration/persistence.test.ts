import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  createDatabase,
  users,
  organizations,
  organizationMembers,
  collectionRuns,
  procurements,
  rawSourceRecords,
  procurementVersions,
  outboxEvents,
  dataSources,
  plans,
  subscriptions,
  commercialProfiles,
  opportunityMatches,
  alerts,
  alertPreferences,
} from '../../packages/database/src/index.js';
import { eq, inArray } from 'drizzle-orm';
import { ingest } from '../../apps/collector/src/core/ingest.js';
import { processEvent } from '../../apps/worker/src/processor.js';
import { TenantGuard } from '../../apps/api/src/modules/tenancy/tenancy.module.js';
import { OrganizationsService } from '../../apps/api/src/modules/organizations/organizations.module.js';
import { ProcurementsService } from '../../apps/api/src/modules/procurements/application/procurements.service.js';
import { EntitlementsService } from '../../apps/api/src/modules/subscriptions/subscriptions.module.js';
import type { DatabaseService } from '../../apps/api/src/common/database.module.js';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import type { CanonicalProcurement } from '../../packages/contracts/src/index.js';
if (!process.env.TEST_DATABASE_URL) throw new Error('Use pnpm test:integration to isolate the database');
const { db, pool } = createDatabase(process.env.TEST_DATABASE_URL);
const database = { db } as DatabaseService;
const prefix = `TEST-${randomUUID()}`;
let orgA: string;
let orgB: string;
let userA: string;
let userB: string;
let runId: string;
let procurementId: string;
const canonical: CanonicalProcurement = {
  externalId: prefix,
  title: 'TESTE AUTOMATIZADO impressora',
  agency: 'FIXTURE DE TESTE',
  agencyState: 'SP',
  agencyMunicipality: '3550308',
  executionState: null,
  executionMunicipality: null,
  category: null,
  status: 'open',
  publishedAt: new Date().toISOString(),
  deadline: '2030-01-01T00:00:00Z',
  estimatedValue: '100.00',
  officialUrl: 'https://pncp.gov.br',
  sourceUpdatedAt: new Date().toISOString(),
};
beforeAll(async () => {
  const a = await db
    .insert(users)
    .values([
      { subject: `${prefix}-a`, email: `${prefix}-a@test.local`, name: 'TEST A' },
      { subject: `${prefix}-b`, email: `${prefix}-b@test.local`, name: 'TEST B' },
    ])
    .returning();
  userA = a[0]!.id;
  userB = a[1]!.id;
  const service = new OrganizationsService(database);
  orgA = (await service.create(userA, { name: `${prefix}-A` }))!.id;
  orgB = (await service.create(userB, { name: `${prefix}-B` }))!.id;
  await db
    .insert(dataSources)
    .values({
      id: prefix,
      name: 'FIXTURE DE TESTE',
      baseUrl: 'https://pncp.gov.br',
      coverageNote: 'Somente teste automatizado',
    });
  runId = (
    await db.insert(collectionRuns).values({ sourceId: prefix, status: 'running' }).returning()
  )[0]!.id;
});
afterAll(async () => {
  // Remove only records owned by this test; never truncate a shared development database.
  const ids = [orgA, orgB].filter(Boolean);
  for (const table of [
    alerts,
    opportunityMatches,
    commercialProfiles,
    alertPreferences,
    subscriptions,
    organizationMembers,
  ])
    await db.delete(table).where(inArray(table.organizationId, ids));
  const { auditLogs, savedProcurements } = await import('../../packages/database/src/index.js');
  await db.delete(savedProcurements).where(inArray(savedProcurements.organizationId, ids));
  await db.delete(auditLogs).where(inArray(auditLogs.organizationId, ids));
  if (procurementId) {
    await db
      .delete(procurementVersions)
      .where(eq(procurementVersions.procurementId, procurementId));
    await db.delete(procurements).where(eq(procurements.id, procurementId));
  }
  await db.delete(rawSourceRecords).where(eq(rawSourceRecords.sourceId, prefix));
  await db.delete(collectionRuns).where(eq(collectionRuns.sourceId, prefix));
  await db.delete(dataSources).where(eq(dataSources.id, prefix));
  await db.delete(organizations).where(inArray(organizations.id, ids));
  await db.delete(users).where(inArray(users.id, [userA, userB].filter(Boolean)));
  await pool.end();
});
describe('PostgreSQL real e limites de domínio', () => {
  it('cria empresa, proprietário e avaliação atomicamente', async () => {
    expect(
      await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.organizationId, orgA),
      }),
    ).toMatchObject({ userId: userA, role: 'owner' });
    expect(
      await db.query.subscriptions.findFirst({ where: eq(subscriptions.organizationId, orgA) }),
    ).toMatchObject({ status: 'trial' });
  });
  it('impede acesso cruzado mesmo com organization-id válido', async () => {
    const guard = new TenantGuard(database, new Reflector());
    const request = { headers: { 'x-organization-id': orgB }, identity: { id: userA } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => () => {},
      getClass: () => class {},
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(ctx)).rejects.toThrow('Você não pertence');
    request.headers['x-organization-id'] = orgA;
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });
  it('deduplica ingestão e registra nova versão apenas na atualização', async () => {
    const raw = {
      externalId: prefix,
      payload: { fixture: true, title: canonical.title },
      collectedAt: new Date(),
    };
    const first = await ingest(db, prefix, runId, raw, canonical);
    procurementId = first.id;
    expect(first.changed).toBe(true);
    const duplicates = await Promise.all([
      ingest(db, prefix, runId, raw, canonical),
      ingest(db, prefix, runId, raw, canonical),
    ]);
    expect(duplicates.every((r) => !r.changed)).toBe(true);
    await ingest(
      db,
      prefix,
      runId,
      { ...raw, payload: { fixture: true, title: 'updated' } },
      { ...canonical, title: 'TESTE AUTOMATIZADO impressora atualizada' },
    );
    expect(
      await db
        .select()
        .from(procurementVersions)
        .where(eq(procurementVersions.procurementId, procurementId)),
    ).toHaveLength(2);
  });
  it('isola favoritos por organização', async () => {
    const service = new ProcurementsService(database);
    await service.save({ organizationId: orgA, userId: userA, role: 'owner' }, procurementId);
    expect(await service.favorites(orgA)).toHaveLength(1);
    expect(await service.favorites(orgB)).toHaveLength(0);
    await service.remove({ organizationId: orgB, userId: userB, role: 'owner' }, procurementId);
    expect(await service.favorites(orgA)).toHaveLength(1);
  });
  it('reprocessa jobs sem duplicar matches ou alertas', async () => {
    await db
      .insert(commercialProfiles)
      .values({
        organizationId: orgA,
        name: 'TEST',
        keywords: ['impressora'],
        categories: [],
        coverage: { national: true, states: [], municipalities: [] },
      });
    const event = { type: 'procurement.changed', procurementId };
    await processEvent(db, event);
    await processEvent(db, event);
    expect(
      await db.select().from(opportunityMatches).where(eq(opportunityMatches.organizationId, orgA)),
    ).toHaveLength(1);
    expect(await db.select().from(alerts).where(eq(alerts.organizationId, orgA))).toHaveLength(1);
  });
  it('bloqueia direitos após expiração da avaliação', async () => {
    await db
      .update(subscriptions)
      .set({ trialEndsAt: new Date('2020-01-01') })
      .where(eq(subscriptions.organizationId, orgB));
    await expect(new EntitlementsService(database).rights(orgB)).rejects.toThrow('não está ativa');
  });
  it('possui planos de referência e outbox real', async () => {
    expect((await db.select().from(plans)).length).toBeGreaterThanOrEqual(3);
    expect((await db.select().from(outboxEvents)).length).toBeGreaterThan(0);
  });
});
