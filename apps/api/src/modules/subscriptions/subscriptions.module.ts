import {
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { plans, subscriptions } from '@radar/database';
import type { CommercialProfile, TenantContext } from '@radar/contracts';
import { DatabaseService } from '../../common/database.module.js';
import { Public, Tenant } from '../../common/http.js';
import { TenancyModule, TenantGuard } from '../tenancy/tenancy.module.js';
@Injectable()
export class EntitlementsService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
  async subscription(organizationId: string) {
    const [row] = await this.database.db
      .select({ subscription: subscriptions, plan: plans })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(eq(subscriptions.organizationId, organizationId));
    return row || null;
  }
  async rights(organizationId: string) {
    const row = await this.subscription(organizationId);
    if (
      !row ||
      !['trial', 'active'].includes(row.subscription.status) ||
      (row.subscription.status === 'trial' &&
        (!row.subscription.trialEndsAt || row.subscription.trialEndsAt <= new Date()))
    )
      throw new ForbiddenException('A assinatura não está ativa');
    return row.plan.entitlements;
  }
  async validateProfile(organizationId: string, profile: CommercialProfile, count: number) {
    const rights = await this.rights(organizationId);
    if (
      count >= Number(rights['commercial_profiles.max_count']) ||
      profile.coverage.states.length > Number(rights['coverage.max_states']) ||
      profile.coverage.municipalities.length > Number(rights['coverage.max_municipalities']) ||
      (profile.coverage.national && !rights['coverage.national'])
    )
      throw new ForbiddenException('O perfil excede a cobertura ou o limite do plano');
  }
}
@Controller()
class SubscriptionsController {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(EntitlementsService) private readonly service: EntitlementsService,
  ) {}
  @Public() @Get('plans') plans() {
    return this.database.db.select().from(plans);
  }
  @UseGuards(TenantGuard) @Get('subscription') get(@Tenant() tenant: TenantContext) {
    return this.service.subscription(tenant.organizationId);
  }
}
@Module({
  imports: [TenancyModule],
  controllers: [SubscriptionsController],
  providers: [EntitlementsService],
  exports: [EntitlementsService],
})
export class SubscriptionsModule {}
