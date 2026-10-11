import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, ilike, gt, desc, sql } from 'drizzle-orm';
import { procurements, procurementVersions, savedProcurements } from '@radar/database';
import { searchInput, type TenantContext } from '@radar/contracts';
import { DatabaseService } from '../../../common/database.module.js';
import { parse, uuid } from '../../../common/http.js';
@Injectable()
export class ProcurementsService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
  async search(query: unknown) {
    const search = parse(searchInput, query);
    const where = and(
      search.q ? ilike(procurements.title, `%${search.q.replace(/[%_\\]/g, '\\$&')}%`) : undefined,
      search.uf ? eq(procurements.agencyState, search.uf) : undefined,
      search.open === 'true'
        ? and(eq(procurements.status, 'open'), gt(procurements.deadline, new Date()))
        : undefined,
    );
    const [items, total] = await Promise.all([
      this.database.db
        .select()
        .from(procurements)
        .where(where)
        .orderBy(desc(procurements.publishedAt), procurements.id)
        .offset((search.page - 1) * search.pageSize)
        .limit(search.pageSize),
      this.database.db
        .select({ count: sql<number>`count(*)::int` })
        .from(procurements)
        .where(where),
    ]);
    return { items, total: total[0]!.count, page: search.page, pageSize: search.pageSize };
  }
  async detail(id: string) {
    const item = await this.database.db.query.procurements.findFirst({
      where: eq(procurements.id, uuid(id)),
    });
    if (!item) throw new NotFoundException('Licitação não encontrada');
    return {
      ...item,
      versions: await this.database.db
        .select({ version: procurementVersions.version, createdAt: procurementVersions.createdAt })
        .from(procurementVersions)
        .where(eq(procurementVersions.procurementId, id))
        .orderBy(desc(procurementVersions.version)),
    };
  }
  favorites(organizationId: string) {
    return this.database.db
      .select({ procurement: procurements, savedAt: savedProcurements.createdAt })
      .from(savedProcurements)
      .innerJoin(procurements, eq(procurements.id, savedProcurements.procurementId))
      .where(eq(savedProcurements.organizationId, organizationId))
      .orderBy(desc(savedProcurements.createdAt));
  }
  async save(tenant: TenantContext, id: string) {
    await this.detail(id);
    await this.database.db
      .insert(savedProcurements)
      .values({ organizationId: tenant.organizationId, userId: tenant.userId, procurementId: id })
      .onConflictDoNothing();
    return { saved: true };
  }
  async remove(tenant: TenantContext, id: string) {
    await this.database.db
      .delete(savedProcurements)
      .where(
        and(
          eq(savedProcurements.organizationId, tenant.organizationId),
          eq(savedProcurements.procurementId, uuid(id)),
        ),
      );
    return { saved: false };
  }
}
