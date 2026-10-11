# ADR 0005 — Keycloak e BFF

Status: aceito. Keycloak local fornece cadastro, confirmação e recuperação por e-mail. openid-client implementa Authorization Code, PKCE, state, nonce, descoberta e refresh. jose valida JWT na API. nuxt-auth-utils fornece cookie selado HttpOnly, sem criptografia artesanal.

Tokens ficam no Redis por sessão opaca; não em localStorage ou payload público de sessão. Sessão expirada exige novo login. Logout elimina sessão local e tokens do Redis; a sessão SSO do Keycloak pode permanecer até sua própria expiração. Encerramento global SSO e revogação central são evolução pendente.

HTTP e segredos fixos são exclusivamente locais. Produção exige HTTPS, emissor configurado, secrets próprios e retirada dos usuários de demonstração. Keycloak usa banco PostgreSQL separado e Mailpit captura apenas e-mails de desenvolvimento.
