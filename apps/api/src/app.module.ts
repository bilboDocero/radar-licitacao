import { Controller, Get, Inject, Module, ServiceUnavailableException } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { sql } from 'drizzle-orm';
import { DatabaseModule, DatabaseService } from './common/database.module.js';
import { RedisModule, RedisService } from './common/redis.module.js';
import { Public } from './common/http.js';
import { IdentityModule, IdentityGuard } from './modules/identity/identity.module.js';
import { OrganizationsModule } from './modules/organizations/organizations.module.js';
import { CommercialProfilesModule } from './modules/commercial-profiles/commercial-profiles.module.js';
import { GeographyModule } from './modules/geography/geography.module.js';
import { SourcesModule } from './modules/sources/sources.module.js';
import { ProcurementsModule } from './modules/procurements/procurements.module.js';
import { MatchingModule } from './modules/matching/matching.module.js';
import { AlertsModule } from './modules/alerts/alerts.module.js';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module.js';
import { BillingModule } from './modules/billing/billing.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { PartnersModule } from './modules/partners/partners.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { DocumentIntelligenceModule } from './modules/document-intelligence/document-intelligence.module.js';
@Controller('health')
class HealthController {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}
  @Public() @Get() async health() {
    try {
      await this.database.db.execute(sql`select 1`);
      await this.redis.ping();
      return { status: 'ok', database: 'ok', redis: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Dependência indisponível');
    }
  }
}
@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    IdentityModule,
    OrganizationsModule,
    CommercialProfilesModule,
    GeographyModule,
    SourcesModule,
    ProcurementsModule,
    MatchingModule,
    AlertsModule,
    SubscriptionsModule,
    BillingModule,
    NotificationsModule,
    PartnersModule,
    AuditModule,
    DocumentIntelligenceModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: IdentityGuard },
  ],
})
export class AppModule {}
