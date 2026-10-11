import { Controller, Get, Inject, Module } from '@nestjs/common';
import { desc, sql } from 'drizzle-orm';
import {
  auditLogs,
  organizations,
  partners,
  sourceRequests,
  collectionRuns,
  procurements,
  dataSources,
  plans,
} from '@radar/database';
import { DatabaseService } from '../../common/database.module.js';
import { PlatformAdmin } from '../../common/http.js';
@Controller('admin')
@PlatformAdmin()
class AdminController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
  @Get() async overview() {
    const db = this.database.db;
    return {
      organizations: (
        await db.select({ count: sql<number>`count(*)::int` }).from(organizations)
      )[0]!.count,
      procurements: (await db.select({ count: sql<number>`count(*)::int` }).from(procurements))[0]!
        .count,
      sources: (await db.select().from(dataSources)).length,
    };
  }
  @Get('organizations') organizations() {
    return this.database.db.select().from(organizations).limit(100);
  }
  @Get('partners') partners() {
    return this.database.db.select().from(partners).limit(100);
  }
  @Get('requests') requests() {
    return this.database.db.select().from(sourceRequests).limit(100);
  }
  @Get('runs') runs() {
    return this.database.db
      .select()
      .from(collectionRuns)
      .orderBy(desc(collectionRuns.startedAt))
      .limit(100);
  }
  @Get('audit') audit() {
    return this.database.db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
  }
  @Get('plans') plans() {
    return this.database.db.select().from(plans);
  }
  @Get('procurements') procurements() {
    return this.database.db
      .select()
      .from(procurements)
      .orderBy(desc(procurements.createdAt))
      .limit(100);
  }
}
@Module({ controllers: [AdminController] })
export class AuditModule {}
