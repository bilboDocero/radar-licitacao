import type { OpenAPIObject, SchemaObject } from '@nestjs/swagger';
import { inputSchemas } from '@radar/contracts/openapi';
export function completeOpenApi(document: OpenAPIObject) {
  document.components ||= {};
  document.components.schemas ||= {};
  Object.assign(document.components.schemas, inputSchemas as Record<string, SchemaObject>);
  const bodies: Record<string, [string, string]> = {
    '/api/v1/organizations': ['post', 'OrganizationInput'],
    '/api/v1/profiles': ['post', 'ProfileInput'],
    '/api/v1/sources/requests': ['post', 'SourceRequestInput'],
    '/api/v1/alert-preferences': ['put', 'AlertPreferenceInput'],
    '/api/v1/partners': ['post', 'PartnerInput'],
    '/api/v1/partners/invitations': ['post', 'InvitationInput'],
  };
  for (const [path, [method, name]] of Object.entries(bodies)) {
    const operation = document.paths[path]?.[method as 'post' | 'put'];
    if (operation)
      operation.requestBody = {
        required: true,
        content: { 'application/json': { schema: { $ref: `#/components/schemas/${name}` } } },
      };
  }
  for (const [path, methods] of Object.entries(document.paths))
    for (const method of ['get', 'post', 'put', 'delete'] as const) {
      const operation = methods[method];
      if (!operation) continue;
      if (
        !['/api/v1/health', '/api/v1/plans', '/api/v1/geography', '/api/v1/sources'].includes(
          path,
        ) ||
        method !== 'get'
      )
        operation.security = [{ bearer: [] }];
      operation.responses['400'] = {
        description:
          'Entrada inválida: error.status, error.message, error.issues e error.correlationId',
      };
      operation.responses['401'] = { description: 'Sessão OIDC inválida, ausente ou expirada' };
      operation.responses['403'] = {
        description: 'Associação, papel ou direito de plano insuficiente',
      };
    }
  return document;
}
