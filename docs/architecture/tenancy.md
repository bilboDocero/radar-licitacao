# Isolamento de empresas

`X-Organization-Id` é uma seleção não confiável. O IdentityGuard valida o JWT OIDC; o TenantGuard confirma a associação do usuário e injeta TenantContext. Recursos de gerenciamento exigem owner/admin. Consultas privadas usam organization_id, inclusive leitura/marcação de alertas e remoção de favoritos.

Papéis de plataforma vêm de claims assinados do Keycloak. O acesso à área de parceiro exige propriedade de um cadastro de parceiro. Um vínculo partner_clients permite visualizar nome da empresa e situação da assinatura, não concede associação à organização.

O usuário pode pertencer a várias empresas. A preferência de empresa no cookie do navegador não concede direitos. Rotas privadas têm middleware SSR, middleware de navegação e proteção da API. Mutação no BFF exige Origin exata; sessão SameSite=Lax e HttpOnly. O Redis mantém os tokens fora do JavaScript do cliente.

Testes de integração exercitam acesso cruzado, favoritos e expiração de avaliação. Validação HTTP/E2E complementa as regras. RLS, permissões mais finas e convites de membros estão no roadmap; não devem ser confundidos com implementação presente.
