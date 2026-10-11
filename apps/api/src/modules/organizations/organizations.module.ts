import {
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  Post,
  ConflictException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { organizationInput } from '@radar/contracts';
import {
  organizations,
  organizationMembers,
  subscriptions,
  alertPreferences,
  auditLogs,
} from '@radar/database';
import { DatabaseService } from '../../common/database.module.js';
import { Identity, parse, type AuthRequest } from '../../common/http.js';
@Injectable()
export class OrganizationsService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
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
}
@Controller('organizations')
class OrganizationsController {
  constructor(@Inject(OrganizationsService) private readonly service: OrganizationsService) {}
  @Get() list(@Identity() user: AuthRequest['identity']) {
    return this.service.list(user.id);
  }
  @Post() create(@Identity() user: AuthRequest['identity'], @Body() body: unknown) {
    return this.service.create(user.id, body);
  }
}
@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
