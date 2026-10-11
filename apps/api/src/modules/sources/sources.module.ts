import { Body, Controller, Get, Inject, Module, Post, UseGuards } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { dataSources, sourceRequests, collectionRuns } from '@radar/database';
import { sourceRequestInput, type TenantContext } from '@radar/contracts';
import { DatabaseService } from '../../common/database.module.js';
import { Public, Tenant, Manage, parse } from '../../common/http.js';
import { TenancyModule, TenantGuard } from '../tenancy/tenancy.module.js';
@Controller('sources')
class SourcesController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
  @Public() @Get() async list() {
    return {
      sources: await this.database.db.select().from(dataSources),
      runs: await this.database.db
        .select({
          sourceId: collectionRuns.sourceId,
          status: collectionRuns.status,
          records: collectionRuns.records,
          startedAt: collectionRuns.startedAt,
          finishedAt: collectionRuns.finishedAt,
        })
        .from(collectionRuns)
        .orderBy(desc(collectionRuns.startedAt))
        .limit(5),
    };
  }
  @UseGuards(TenantGuard) @Get('requests') requests(@Tenant() tenant: TenantContext) {
    return this.database.db
      .select()
      .from(sourceRequests)
      .where(eq(sourceRequests.organizationId, tenant.organizationId));
  }
  @UseGuards(TenantGuard) @Manage() @Post('requests') async suggest(
    @Tenant() tenant: TenantContext,
    @Body() body: unknown,
  ) {
    // Store only: no request, DNS lookup or crawler is started from a suggested URL.
    const [row] = await this.database.db
      .insert(sourceRequests)
      .values({ ...parse(sourceRequestInput, body), organizationId: tenant.organizationId })
      .returning();
    return row;
  }
}
@Module({ imports: [TenancyModule], controllers: [SourcesController] })
export class SourcesModule {}
