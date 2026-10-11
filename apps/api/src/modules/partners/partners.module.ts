import {
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  Post,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  Param,
  ConflictException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull, gt } from 'drizzle-orm';
import {
  partners,
  partnerClients,
  partnerInvitations,
  organizations,
  subscriptions,
  users,
  auditLogs,
} from '@radar/database';
import { partnerInput, invitationInput, type TenantContext } from '@radar/contracts';
import { DatabaseService } from '../../common/database.module.js';
import {
  Identity,
  PlatformAdmin,
  Tenant,
  Manage,
  parse,
  type AuthRequest,
} from '../../common/http.js';
import { TenancyModule, TenantGuard } from '../tenancy/tenancy.module.js';
@Injectable()
class PartnersService {
  constructor(@Inject(DatabaseService) readonly database: DatabaseService) {}
  async owned(userId: string) {
    const partner = await this.database.db.query.partners.findFirst({
      where: eq(partners.ownerUserId, userId),
    });
    if (!partner) throw new ForbiddenException('Parceiro não cadastrado para este usuário');
    return partner;
  }
  async dashboard(userId: string) {
    const partner = await this.owned(userId);
    const clients = await this.database.db
      .select({
        id: organizations.id,
        name: organizations.name,
        planId: subscriptions.planId,
        status: subscriptions.status,
      })
      .from(partnerClients)
      .innerJoin(organizations, eq(organizations.id, partnerClients.organizationId))
      .leftJoin(subscriptions, eq(subscriptions.organizationId, organizations.id))
      .where(eq(partnerClients.partnerId, partner.id));
    const invitations = await this.database.db
      .select({
        id: partnerInvitations.id,
        email: partnerInvitations.email,
        expiresAt: partnerInvitations.expiresAt,
        acceptedAt: partnerInvitations.acceptedAt,
      })
      .from(partnerInvitations)
      .where(eq(partnerInvitations.partnerId, partner.id));
    return { partner, clients, invitations };
  }
  async invite(userId: string, input: unknown) {
    const partner = await this.owned(userId);
    const { email } = parse(invitationInput, input);
    const token = randomBytes(32).toString('hex');
    await this.database.db
      .insert(partnerInvitations)
      .values({
        partnerId: partner.id,
        email: email.toLowerCase(),
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 7 * 86400000),
      });
    return {
      token,
      path: `/convite/${token}`,
      message: 'Copie o link e compartilhe com a empresa. Envio automático ainda não disponível.',
    };
  }
  async accept(tenant: TenantContext, user: AuthRequest['identity'], token: string) {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new NotFoundException('Convite inválido');
    return this.database.db.transaction(async (tx) => {
      const [invitation] = await tx
        .select()
        .from(partnerInvitations)
        .where(
          and(
            eq(partnerInvitations.tokenHash, createHash('sha256').update(token).digest('hex')),
            isNull(partnerInvitations.acceptedAt),
            gt(partnerInvitations.expiresAt, new Date()),
          ),
        )
        .for('update');
      if (!invitation) throw new NotFoundException('Convite inválido ou expirado');
      if (invitation.email !== user.email)
        throw new ForbiddenException('Este convite pertence a outro e-mail');
      const existing = await tx
        .select()
        .from(partnerClients)
        .where(eq(partnerClients.organizationId, tenant.organizationId));
      if (existing.length) throw new ConflictException('Empresa já vinculada a um parceiro');
      await tx
        .insert(partnerClients)
        .values({ partnerId: invitation.partnerId, organizationId: tenant.organizationId });
      await tx
        .update(partnerInvitations)
        .set({ acceptedAt: new Date() })
        .where(eq(partnerInvitations.id, invitation.id));
      await tx
        .insert(auditLogs)
        .values({
          organizationId: tenant.organizationId,
          userId: user.id,
          action: 'partner.linked',
          resourceId: invitation.partnerId,
        });
      return { linked: true };
    });
  }
}
@Controller('partners')
class PartnersController {
  constructor(@Inject(PartnersService) private readonly service: PartnersService) {}
  @Get('me') dashboard(@Identity() user: AuthRequest['identity']) {
    return this.service.dashboard(user.id);
  }
  @Post('invitations') invite(@Identity() user: AuthRequest['identity'], @Body() body: unknown) {
    return this.service.invite(user.id, body);
  }
  @Post('invitations/:token/accept') @UseGuards(TenantGuard) @Manage() accept(
    @Tenant() tenant: TenantContext,
    @Identity() user: AuthRequest['identity'],
    @Param('token') token: string,
  ) {
    return this.service.accept(tenant, user, token);
  }
  @PlatformAdmin() @Post() async create(@Body() body: unknown) {
    const data = parse(partnerInput, body);
    const owner = await this.service.database.db.query.users.findFirst({
      where: eq(users.email, data.ownerEmail.toLowerCase()),
    });
    if (!owner) throw new NotFoundException('O responsável precisa acessar a plataforma primeiro');
    const [row] = await this.service.database.db
      .insert(partners)
      .values({ name: data.name, ownerUserId: owner.id, brandName: data.brandName })
      .returning();
    return row;
  }
}
@Module({
  imports: [TenancyModule],
  controllers: [PartnersController],
  providers: [PartnersService],
})
export class PartnersModule {}
