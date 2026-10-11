# Segurança e limites da instalação

API valida JWT RS256 contra JWKS com emissor/audiência/expiração e e-mail verificado. BFF exige Origin para mutações, mantém cookies HttpOnly/SameSite e tokens no Redis. Guards limitam recursos por associação e papel; parceiro comercial não é membro. Entradas Zod estritas rejeitam tenant_id injetado.

Headers de correlação são restritos em formato/tamanho. Erros internos são ocultos na resposta; logs estruturados não incluem tokens. Helmet e rate limit de 120 requisições/minuto/IP estão ativos. Rate limit atual é em memória por instância: trocar por armazenamento compartilhado antes de escalar a API.

As credenciais do Compose são públicas e exclusivas de desenvolvimento; portas de dependências são ligadas a loopback. Servidores dev usam 0.0.0.0 para funcionar também em containers. Exposição externa exige firewall/proxy/HTTPS. Não usar esta configuração como produção.

Novas fontes não são executadas por URL de usuário. Apenas origem PNCP compilada e redirects desabilitados. Alterações sensíveis básicas geram auditoria; cobertura de auditoria precisa crescer junto com novos comandos de domínio.
