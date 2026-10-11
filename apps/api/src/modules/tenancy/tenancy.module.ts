import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
  Module,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { and, eq } from 'drizzle-orm';
import { organizationMembers } from '@radar/database';
import { DatabaseService } from '../../common/database.module.js';
import type { AuthRequest } from '../../common/http.js';
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const id = request.headers['x-organization-id'];
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id))
      throw new BadRequestException('Selecione uma empresa válida');
    const member = await this.database.db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, id),
        eq(organizationMembers.userId, request.identity.id),
      ),
    });
    if (!member) throw new ForbiddenException('Você não pertence a esta empresa');
    if (
      this.reflector.getAllAndOverride('manage', [context.getHandler(), context.getClass()]) &&
      !['owner', 'admin'].includes(member.role)
    )
      throw new ForbiddenException('Ação restrita aos administradores da empresa');
    request.tenant = { organizationId: id, userId: request.identity.id, role: member.role };
    return true;
  }
}
@Module({ providers: [TenantGuard], exports: [TenantGuard] })
export class TenancyModule {}
