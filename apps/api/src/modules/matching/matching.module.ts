import { Controller, Get, Inject, Module, UseGuards } from '@nestjs/common';
import { and, eq, desc, gt } from 'drizzle-orm';
import { opportunityMatches, procurements } from '@radar/database';
import type { TenantContext } from '@radar/contracts';
import { DatabaseService } from '../../common/database.module.js';
import { Tenant } from '../../common/http.js';
import { TenancyModule, TenantGuard } from '../tenancy/tenancy.module.js';
@Controller('matches')
@UseGuards(TenantGuard)
class MatchingController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
  @Get() list(@Tenant() tenant: TenantContext) {
    return this.database.db
      .select({ match: opportunityMatches, procurement: procurements })
      .from(opportunityMatches)
      .innerJoin(procurements, eq(procurements.id, opportunityMatches.procurementId))
      .where(
        and(
          eq(opportunityMatches.organizationId, tenant.organizationId),
          eq(procurements.status, 'open'),
          gt(procurements.deadline, new Date()),
        ),
      )
      .orderBy(desc(opportunityMatches.score))
      .limit(100);
  }
}
@Module({ imports: [TenancyModule], controllers: [MatchingController] })
export class MatchingModule {}
