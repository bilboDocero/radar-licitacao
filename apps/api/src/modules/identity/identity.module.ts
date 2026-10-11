import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
  Module,
  UnauthorizedException,
  ForbiddenException,
  Controller,
  Get,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { environment } from '@radar/config';
import { users } from '@radar/database';
import { DatabaseService } from '../../common/database.module.js';
import { Identity, type AuthRequest } from '../../common/http.js';
@Injectable()
export class IdentityGuard implements CanActivate {
  private readonly config = environment();
  private readonly jwks = createRemoteJWKSet(new URL(this.config.OIDC_JWKS_URL));
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}
  async canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride('public', [context.getHandler(), context.getClass()]))
      return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer '))
      throw new UnauthorizedException('Entre na sua conta');
    let claims;
    try {
      claims = (
        await jwtVerify(authorization.slice(7), this.jwks, {
          issuer: this.config.OIDC_ISSUER,
          audience: this.config.OIDC_AUDIENCE,
          algorithms: ['RS256'],
        })
      ).payload;
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }
    if (!claims.sub || typeof claims.email !== 'string' || claims.email_verified !== true)
      throw new UnauthorizedException('Verifique seu e-mail');
    const realm = claims.realm_access as { roles?: string[] } | undefined;
    const roles = realm?.roles || [];
    if (
      this.reflector.getAllAndOverride('platform-admin', [
        context.getHandler(),
        context.getClass(),
      ]) &&
      !roles.includes('platform-admin')
    )
      throw new ForbiddenException('Acesso administrativo necessário');
    const [user] = await this.database.db
      .insert(users)
      .values({
        subject: claims.sub,
        email: claims.email.toLowerCase(),
        name: typeof claims.name === 'string' ? claims.name : claims.email,
      })
      .onConflictDoUpdate({ target: users.subject, set: { email: claims.email.toLowerCase() } })
      .returning();
    request.identity = {
      id: user!.id,
      subject: claims.sub,
      email: claims.email.toLowerCase(),
      roles,
    };
    return true;
  }
}
@Controller('identity')
class IdentityController {
  @Get('me') me(@Identity() identity: AuthRequest['identity']) {
    return identity;
  }
}
@Module({ controllers: [IdentityController], providers: [IdentityGuard], exports: [IdentityGuard] })
export class IdentityModule {}
