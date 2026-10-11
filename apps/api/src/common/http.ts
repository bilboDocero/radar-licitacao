import {
  ArgumentsHost,
  Catch,
  createParamDecorator,
  ExceptionFilter,
  HttpException,
  SetMetadata,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { TenantContext } from '@radar/contracts';
import { ZodError, type ZodTypeAny, type output } from 'zod';
import { logger } from '@radar/config';
export interface AuthRequest extends Request {
  identity: { id: string; subject: string; email: string; roles: string[] };
  tenant: TenantContext;
  correlationId: string;
}
export const Public = () => SetMetadata('public', true);
export const PlatformAdmin = () => SetMetadata('platform-admin', true);
export const Manage = () => SetMetadata('manage', true);
export const Identity = createParamDecorator(
  (_, ctx) => ctx.switchToHttp().getRequest<AuthRequest>().identity,
);
export const Tenant = createParamDecorator(
  (_, ctx) => ctx.switchToHttp().getRequest<AuthRequest>().tenant,
);
export const Correlation = createParamDecorator(
  (_, ctx) => ctx.switchToHttp().getRequest<AuthRequest>().correlationId,
);
export function parse<S extends ZodTypeAny>(schema: S, input: unknown): output<S> {
  return schema.parse(input);
}
export function uuid(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
    throw new BadRequestException('Identificador inválido');
  return value;
}
@Catch()
export class ErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<AuthRequest>();
    const status =
      error instanceof ZodError ? 400 : error instanceof HttpException ? error.getStatus() : 500;
    if (status >= 500)
      logger.error({ err: error, correlationId: request.correlationId }, 'Request failed');
    context
      .getResponse<Response>()
      .status(status)
      .json({
        error: {
          status,
          message:
            error instanceof ZodError
              ? 'Dados inválidos'
              : status >= 500
                ? 'Erro interno; tente novamente'
                : error instanceof Error
                  ? error.message
                  : 'Erro',
          ...(error instanceof ZodError ? { issues: error.issues } : {}),
          correlationId: request.correlationId,
        },
      });
  }
}
