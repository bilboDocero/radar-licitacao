import {
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  Post,
  Patch,
  Query,
  UseGuards,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  organizationInput,
  updateOrganizationInput,
  type TenantContext,
} from '@radar/contracts';
import {
  organizations,
  organizationMembers,
  subscriptions,
  alertPreferences,
  auditLogs,
} from '@radar/database';
import { DatabaseService } from '../../common/database.module.js';
import { Identity, Tenant, Manage, parse, type AuthRequest } from '../../common/http.js';
import { TenancyModule, TenantGuard } from '../tenancy/tenancy.module.js';
import { CompanyRegistryService } from './company-registry/company-registry.service.js';

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(CompanyRegistryService) private readonly registryService: CompanyRegistryService,
  ) {}

  list(userId: string) {
    return this.database.db
      .select({
        id: organizations.id,
        name: organizations.name,
        cnpj: organizations.cnpj,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .where(eq(organizationMembers.userId, userId));
  }

  async create(userId: string, input: unknown) {
    const data = parse(organizationInput, input);
    try {
      return await this.database.db.transaction(async (tx) => {
        const [organization] = await tx.insert(organizations).values(data).returning();
        await tx
          .insert(organizationMembers)
          .values({ organizationId: organization!.id, userId, role: 'owner' });
        await tx
          .insert(subscriptions)
          .values({
            organizationId: organization!.id,
            planId: 'nacional',
            status: 'trial',
            trialEndsAt: new Date(Date.now() + 14 * 86400000),
          });
        await tx.insert(alertPreferences).values({ organizationId: organization!.id });
        await tx
          .insert(auditLogs)
          .values({
            organizationId: organization!.id,
            userId,
            action: 'organization.created',
            resourceId: organization!.id,
          });
        return organization;
      });
    } catch (error) {
      if ((error as { cause?: { code: string } }).cause?.code === '23505')
        throw new ConflictException('CNPJ já cadastrado');
      throw error;
    }
  }

  async update(organizationId: string, userId: string, input: unknown) {
    const data = parse(updateOrganizationInput, input);
    try {
      const [updated] = await this.database.db
        .update(organizations)
        .set(data)
        .where(eq(organizations.id, organizationId))
        .returning();

      if (!updated) {
        throw new NotFoundException('Organização não encontrada');
      }

      await this.database.db.insert(auditLogs).values({
        organizationId,
        userId,
        action: 'organization.updated',
        resourceId: organizationId,
      });

      return updated;
    } catch (error) {
      if ((error as { cause?: { code: string } }).cause?.code === '23505')
        throw new ConflictException('CNPJ já cadastrado para outra organização');
      throw error;
    }
  }

  async getRegistry(organizationId: string, forceRefresh = false) {
    const org = await this.database.db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!org) {
      throw new NotFoundException('Organização não encontrada');
    }

    if (!org.cnpj) {
      return {
        configured: false,
        cnpj: null,
        organizationName: org.name,
      };
    }

    const registry = await this.registryService.getRegistryByCnpj(org.cnpj, {
      forceRefresh,
      organizationId,
    });

    return {
      configured: true,
      ...registry,
    };
  }
}

@Controller('organizations')
class OrganizationsController {
  constructor(@Inject(OrganizationsService) private readonly service: OrganizationsService) {}

  @Get()
  list(@Identity() user: AuthRequest['identity']) {
    return this.service.list(user.id);
  }

  @Post()
  create(@Identity() user: AuthRequest['identity'], @Body() body: unknown) {
    return this.service.create(user.id, body);
  }

  @UseGuards(TenantGuard)
  @Get('current/registry')
  getRegistry(
    @Tenant() tenant: TenantContext,
    @Query('refresh') refresh?: string,
  ) {
    return this.service.getRegistry(tenant.organizationId, refresh === 'true');
  }

  @UseGuards(TenantGuard)
  @Manage()
  @Patch('current')
  updateCurrent(
    @Tenant() tenant: TenantContext,
    @Identity() user: AuthRequest['identity'],
    @Body() body: unknown,
  ) {
    return this.service.update(tenant.organizationId, user.id, body);
  }
}

@Module({
  imports: [TenancyModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, CompanyRegistryService],
  exports: [OrganizationsService, CompanyRegistryService],
})
export class OrganizationsModule {}
