import {
  Body,
  Controller,
  Get,
  Inject,
  Module,
  Put,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { alertPreferences } from '@radar/database';
import { alertPreferenceInput, type TenantContext } from '@radar/contracts';
import { DatabaseService } from '../../common/database.module.js';
import { Tenant, Manage, parse } from '../../common/http.js';
import { TenancyModule, TenantGuard } from '../tenancy/tenancy.module.js';
import { EntitlementsService, SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
@Controller('alert-preferences')
@UseGuards(TenantGuard)
class AlertsController {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(EntitlementsService) private readonly entitlements: EntitlementsService,
  ) {}
  @Get() get(@Tenant() tenant: TenantContext) {
    return this.database.db.query.alertPreferences.findFirst({
      where: eq(alertPreferences.organizationId, tenant.organizationId),
    });
  }
  @Manage() @Put() async save(@Tenant() tenant: TenantContext, @Body() body: unknown) {
    const input = parse(alertPreferenceInput, body);
    if (input.enabled && !(await this.entitlements.rights(tenant.organizationId))['alerts.enabled'])
      throw new ForbiddenException('Alertas indisponíveis no plano');
    const [row] = await this.database.db
      .insert(alertPreferences)
      .values({ ...input, organizationId: tenant.organizationId })
      .onConflictDoUpdate({ target: alertPreferences.organizationId, set: input })
      .returning();
    return row;
  }
}
@Module({ imports: [TenancyModule, SubscriptionsModule], controllers: [AlertsController] })
export class AlertsModule {}
