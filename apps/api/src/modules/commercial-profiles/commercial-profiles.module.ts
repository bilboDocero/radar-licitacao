import {
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  Post,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import {
  commercialProfiles,
  outboxEvents,
  organizations,
  auditLogs,
  municipalities,
} from '@radar/database';
import { profileInput, type TenantContext } from '@radar/contracts';
import { DatabaseService } from '../../common/database.module.js';
import { Tenant, Manage, parse } from '../../common/http.js';
import { TenancyModule, TenantGuard } from '../tenancy/tenancy.module.js';
import { SubscriptionsModule, EntitlementsService } from '../subscriptions/subscriptions.module.js';
@Injectable()
export class CommercialProfilesService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(EntitlementsService) private readonly entitlements: EntitlementsService,
  ) {}
  list(organizationId: string) {
    return this.database.db
      .select()
      .from(commercialProfiles)
      .where(eq(commercialProfiles.organizationId, organizationId));
  }
  async create(tenant: TenantContext, input: unknown) {
    const profile = parse(profileInput, input);
    if (
      !profile.coverage.national &&
      !profile.coverage.states.length &&
      !profile.coverage.municipalities.length
    )
      throw new BadRequestException('Escolha ao menos uma área de atuação');
    for (const code of profile.coverage.municipalities)
      if (
        !(await this.database.db.query.municipalities.findFirst({
          where: eq(municipalities.code, code),
        }))
      )
        throw new BadRequestException('Município não cadastrado na referência IBGE');
    return this.database.db.transaction(async (tx) => {
      await tx
        .select()
        .from(organizations)
        .where(eq(organizations.id, tenant.organizationId))
        .for('update');
      const counts = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(commercialProfiles)
        .where(eq(commercialProfiles.organizationId, tenant.organizationId));
      await this.entitlements.validateProfile(tenant.organizationId, profile, counts[0]!.count);
      const [row] = await tx
        .insert(commercialProfiles)
        .values({ ...profile, organizationId: tenant.organizationId })
        .returning();
      await tx
        .insert(outboxEvents)
        .values({
          type: 'profile.changed',
          payload: { type: 'profile.changed', organizationId: tenant.organizationId },
        });
      await tx
        .insert(auditLogs)
        .values({
          organizationId: tenant.organizationId,
          userId: tenant.userId,
          action: 'profile.created',
          resourceId: row!.id,
        });
      return row;
    });
  }
}
@Controller('profiles')
@UseGuards(TenantGuard)
class ProfilesController {
  constructor(
    @Inject(CommercialProfilesService) private readonly service: CommercialProfilesService,
  ) {}
  @Get() list(@Tenant() tenant: TenantContext) {
    return this.service.list(tenant.organizationId);
  }
  @Manage() @Post() create(@Tenant() tenant: TenantContext, @Body() body: unknown) {
    return this.service.create(tenant, body);
  }
}
@Module({
  imports: [TenancyModule, SubscriptionsModule],
  controllers: [ProfilesController],
  providers: [CommercialProfilesService],
  exports: [CommercialProfilesService],
})
export class CommercialProfilesModule {}
