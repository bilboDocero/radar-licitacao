# Estado Atual do Projeto — Radar de Licitações Públicas

## 1. Identificação

- **Projeto:** Radar de Licitações Públicas (SaaS B2B2C)
- **Data da última revisão:** 12 de outubro de 2026
- **Branch analisada:** `main`
- **Commit analisado:** `820e163` (`initial implement`)
- **Estágio de maturidade:** MVP (Esqueleto funcional com pendências comerciais e operacionais)
- **Fontes consultadas:**
  - Código-fonte das aplicações em `apps/` (`web`, `api`, `collector`, `worker`)
  - Pacotes compartilhados em `packages/` (`contracts`, `database`, `events`, `source-sdk`, `config`)
  - Schemas e migrations Drizzle em `packages/database/` (`0000_furry_lightspeed.sql`, `0001_shallow_lily_hollister.sql`, `schema.ts`)
  - Suíte de testes em `tests/` (`unit/matching.test.ts`, `unit/collector.test.ts`, `integration/persistence.test.ts`, `e2e/registration.spec.ts`, `e2e/app.spec.ts`)
  - Infraestrutura e compose em `docker-compose.yml` e `infrastructure/`
  - Documentação arquitetural e ADRs em `docs/architecture/`, `docs/adr/`, `docs/sources/`, `docs/security/`, `docs/operations/`
  - Documentos de roadmap em `docs/roadmap/` (`mvp.md`, `intermediate.md`, `mature.md`)
  - Histórico do Git (`git log`, `git branch -a`, `git status`)
- **Limitações da verificação:**
  - **Board de desenvolvimento:** Nenhum board (GitHub Projects, Jira ou Linear) foi identificado ou configurado no repositório; utilitário `gh` CLI não está instalado no ambiente operacional.
  - **Docker local:** O daemon do Docker Desktop encontrava-se inativo durante a auditoria local, impedindo a subida dos containers de infraestrutura (`postgres`, `redis`, `keycloak`, `mailpit`).
  - **Instalação local de pacotes:** A pasta `node_modules` não estava instalada na raiz do repositório no momento da inspeção, impossibilitando a execução ao vivo dos comandos de teste (`pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm typecheck`, `pnpm lint`, `pnpm health`) sem alteração prévia de ambiente. Conforme a regra de governança que proíbe declarar sucesso sem evidência em tempo de execução, os domínios com cobertura implementada foram classificados como `IMPLEMENTED` e não como `VALIDATED`.

---

## 2. Resumo executivo

O projeto encontra-se no estágio de **Esqueleto Funcional do MVP**, com um fluxo vertical ponta a ponta plenamente codificado no padrão monorepo em TypeScript strict (pnpm + Turborepo).

A plataforma conta com:
- Coleta oficial da API do PNCP com controle de taxa, backoff exponencial, locks consultivos transacionais, deduplicação por hash estável e versionamento de editais.
- Publicação confiável de eventos em banco via Outbox Pattern e filas BullMQ com Redis.
- Worker de processamento em segundo plano executando algoritmo puro de matching determinístico explicável e emissão de alertas internos.
- API NestJS em monólito modular com autorização multi-tenant rigorosa baseada em associação no banco (`organization_members`), papéis de acesso e autenticação OIDC via Keycloak.
- Front-end Nuxt 4 (Vue 3, Nuxt UI, Tailwind CSS) com SSR e BFF de mesma origem que blinda tokens de acesso em Redis e gerencia sessões seladas por cookies HttpOnly.

**Fatores que impedem o lançamento comercial imediato:**
1. **Faturamento e cobrança inexistentes:** O módulo de cobrança (`billing`) está em estado inicial de sinalização (`{ configured: false }`); nenhum gateway ou PSP (Stripe, Asaas, etc.) está integrado, inexistindo endpoints de checkout, cobrança recorrente ou tratamento de webhooks.
2. **Cobertura geográfica piloto:** O banco conta apenas com 5 municípios no seed inicial de referência do IBGE (SP, RJ, DF, BH e Curitiba), necessitando da importação completa dos 5.570 municípios brasileiros.
3. **Coleta e agendamento parciais:** Apenas as modalidades 6 (pregão eletrônico) e 8 (dispensa) do PNCP estão codificadas; o agendamento horário de coleta está desativado por padrão (`COLLECTION_ENABLED=false`) e não há backfill histórico completo.
4. **Alertas exclusivamente internos:** Notificações são salvas e lidas apenas in-app; não há infraestrutura para envio externo de e-mails, resumos periódicos (digests) ou canais como WhatsApp/webhook.
5. **Operações cadastrais incompletas na UI:** Falta suporte a edição e exclusão de perfis comerciais, gestão/convite de membros da organização e edição de dados da empresa após a criação inicial.
6. **Pendências jurídicas e de produção:** Minutas de termos de uso e política de privacidade necessitam de revisão legal; rate limiting opera em memória na API e segredos do ambiente Docker são exclusivamente locais.

---

## 3. Estado por domínio

| Domínio | Estado | Evidência | Pendência | Próxima ação |
|---|---|---|---|---|
| **Fundação** | `IMPLEMENTED` | Monorepo pnpm 10.28.2, Turborepo, TypeScript 5.9.3 strict, ESLint 9, Prettier, 4 apps e 5 packages compartilhados. | Execução dos scripts de build/typecheck pendente de instalação local de `node_modules`. | Executar `pnpm install` e validar compilação completa via `pnpm build`. |
| **Autenticação** | `IMPLEMENTED` | BFF OIDC com `openid-client`, PKCE, cookies selados HttpOnly (`nuxt-auth-utils`), tokens em Redis, validação JWT RS256 com JWKS via `jose` na API. | Keycloak e Mailpit exclusivos de ambiente de desenvolvimento; sem provedor IdP configurado para produção nem Single Sign-Out (SLO) global. | Homologar provedor OIDC para produção e configurar encerramento centralizado de sessão. |
| **Multi-tenancy** | `IMPLEMENTED` | `TenantGuard` valida associação em `organization_members` e papéis (`owner`, `admin`, `member`). Header `X-Organization-Id` verificado no banco; predicados em todas as queries privadas. | Sem RLS (Row-Level Security) no PostgreSQL (mitigado por camada de aplicação); sem gestão de múltiplos membros pela interface. | Implementar gestão de membros e avaliar adoção de RLS para defesa em profundidade. |
| **Organizações** | `IMPLEMENTED` | Criação transacional atômica de organização, vínculo de proprietário, assinatura trial (14 dias, plano nacional), preferências de alertas e log de auditoria. | Falta edição de dados cadastrais da organização e deleção/arquivamento da empresa. | Desenvolver rotas e formulários para edição e atualização de dados da organização. |
| **Parceiros** | `IN_PROGRESS` | Tabelas `partners`, `partner_clients`, `partner_invitations`. Geração de convite com token SHA-256 (validade 7 dias), aceite por empresa vinculada e dashboard do parceiro. | Envio de e-mail de convite é manual (cópia de link); comissionamento, relatórios de faturamento e customização white label não implementados. | Implementar envio automático de e-mail para convite e regras de comissionamento de parceiros. |
| **Fontes e coleta** | `IN_PROGRESS` | `SourceConnector`, `PncpConnector` com fetch nativo, controle de taxa, retry exponencial, lock consultivo transacional, deduplicação por hash estável e versionamento. | Apenas modalidades 6 e 8 do PNCP; agendamento horário desativado por padrão; sem ingestão de anexos/editais (PDFs); sem conectores adicionais ativos. | Ampliar modalidades do PNCP, habilitar agendamento monitorado e homologar novos portais. |
| **Licitações** | `IMPLEMENTED` | Catálogo global em `procurements`, busca paginada com filtros (`q`, `uf`, status), rastreabilidade de versões, detalhe oficial e favoritos privados (`saved_procurements`). | Sem download, indexação ou OCR de documentos anexos; locais de execução e categorias dependem de metadados do PNCP. | Implementar extração e persistência de itens licitados e locais de execução detalhados. |
| **Matching** | `IMPLEMENTED` | Algoritmo determinístico puro `matchProcurement` em `@radar/contracts`, cálculo assíncrono via worker com BullMQ, score explicável e persistência em `opportunity_matches`. | Sem matching semântico/vetorial; correspondência baseada em substrings de palavras-chave normalizadas; sem palavras-chave negativas. | Acrescentar suporte a palavras-chave negativas e filtros por faixa de valor monetário. |
| **Geografia** | `IN_PROGRESS` | 27 UFs estruturadas em `@radar/contracts`, tabela `municipalities` e endpoint público `GET /geography` com aviso de dados piloto. | Apenas 5 municípios cadastrados no seed de teste (SP, RJ, DF, BH, Curitiba) em vez dos 5.570 municípios da base oficial IBGE. | Desenvolver migration/script para carga integral dos municípios do IBGE com códigos oficiais. |
| **Alertas** | `IN_PROGRESS` | Tabela `alert_preferences` (frequência diária/semanal), geração de alertas internos em `alerts` pelo worker com chave única contra duplicidade e rotas de leitura. | Notificações restritas ao painel web (in-app); disparo externo de e-mails, resumos periódicos (digest) ou canais móveis/WhatsApp inexistentes. | Construir worker de consolidação e envio externo de notificações e digest por e-mail. |
| **Assinaturas** | `IN_PROGRESS` | Tabelas `plans` (Local, Regional, Nacional) com entitlements em JSONB, verificação de direitos em `EntitlementsService`, período de avaliação de 14 dias ativo. | Módulo `billing` sem gateway de pagamento integrado (`configured: false`); sem checkout, cobrança recorrente, cancelamento ou tratamento de webhooks. | Integrar provedor de pagamento (PSP), tratar webhooks de forma idempotente e gerenciar status. |
| **Administração** | `IMPLEMENTED` | `AuditModule` restrito ao papel `platform-admin`, contadores globais, listagem de empresas, parceiros, solicitações de fontes, execuções de coleta e auditoria. | Consultas fixadas em limite de 100 registros recentes (`.limit(100)`) sem paginação por cursor; sem ações operacionais de retry de coleta na UI. | Implementar paginação administrativa completa e botões para disparo/reexecução de coleta. |
| **Site público e FAQ** | `IMPLEMENTED` | Landing page, funcionalidades, planos, cobertura, FAQ, contato, termos e privacidade implementados em Nuxt 4 com layout responsivo testado via E2E. | Termos de uso e privacidade são minutas iniciais pendentes de validação jurídica; formulário de contato não envia mensagens para serviço externo. | Realizar revisão jurídica dos textos legais e integrar formulário de contato a serviço de CRM. |
| **Segurança** | `IMPLEMENTED` | OIDC RS256 com verificação de audiência/emissor, checagem de e-mail confirmado, tokens em Redis, validação Zod estrita, Helmet, rate limit (120 req/min/IP) e guarda contra SSRF. | Rate limiting opera em memória por nó (não distribuído); RLS desativado no PostgreSQL; segredos no compose são públicos e restritos a dev. | Configurar rate limiting em Redis compartilhado e desenhar cofre de segredos para produção. |
| **Observabilidade** | `IN_PROGRESS` | Logger estruturado com Pino e redaction de credenciais/tokens; inicialização de OpenTelemetry (`startTelemetry`) implementada em API, collector e worker. | Nenhum coletor OTLP configurado no ambiente local; ausência de métricas de negócio e dashboards operacionais (Grafana/Prometheus). | Adicionar stack de observabilidade local no Compose e instrumentar contadores de negócios. |
| **Testes e CI/CD** | `IMPLEMENTED` | Testes unitários de matching e coleta (Vitest), integração com banco isolado temporário, testes E2E com Playwright e workflow GitHub Actions (`ci.yml`). | Testes não puderam ser executados nesta sessão por ausência de `node_modules` local e Docker inativo; arquivo `docs/operations/validation.md` referenciado não existe no disco. | Criar `docs/operations/validation.md` com histórico de execuções e validar execução em ambiente com dependências instaladas. |

---

## 4. Maturidade atual

### MVP (Estágio 1)
- **Capacidades concluídas:**
  - Fundação monorepo em TypeScript strict com linting, formatação e orquestração por Turborepo.
  - Banco de dados PostgreSQL com 22 tabelas mapeadas no Drizzle ORM e migrations versionadas.
  - Autenticação OIDC com Keycloak local (cadastro, confirmação de e-mail e recuperação de senha) e BFF seguro em Nuxt.
  - Onboarding de empresas com associação inicial ao papel de `owner` e período de avaliação gratuito de 14 dias no plano Nacional.
  - Definição de perfis comerciais com palavras-chave, categorias e delimitação de cobertura (estados, municípios ou nacional).
  - Coletor PNCP consumindo API oficial incrementalmente nas modalidades de pregão eletrônico e dispensa com deduplicação por hash e versionamento.
  - Processamento assíncrono via Outbox Pattern e worker BullMQ calculando matching determinístico explicável com pontuação e justificativas.
  - Gestão de parceiros comerciais com links de convite protegidos por token criptográfico e aceite vinculado.
  - Painel administrativo com controle por role `platform-admin`, auditoria e monitoramento de execuções de coleta.
  - Área pública completa com landing page, responsividade mobile e páginas institucionais informando as limitações do MVP.
- **Capacidades pendentes:**
  - Integração real com gateway de pagamento (PSP) para assinaturas pagas.
  - Carga da base integral dos 5.570 municípios do IBGE.
  - Envio de alertas e resumos (digests) para canais externos (e-mail transacional).
  - Funcionalidades de edição/exclusão de perfis e gerenciamento de membros da organização.
  - Agendamento automático ativado com ampliação das modalidades do PNCP.
- **Critérios de aceite ainda não atendidos:**
  - Cobrança real e transição pós-avaliação gratuita com ativação e cancelamento de planos.
  - Cobertura geográfica estendida a todos os municípios brasileiros no cadastro de perfis.
  - Recebimento de alertas de oportunidades por e-mail na frequência configurada (diária/semanal).
- **Principais bloqueios para lançamento:**
  - Falta de integração com provedor financeiro e tratamento de webhooks de assinatura.
  - Dependência de revisão jurídica dos termos de adesão e privacidade.
  - Falta de homologação de infraestrutura externa e domínio de produção.

### Maturidade Intermediária (Estágio 2 — Planejada)
- **Capacidades previstas:**
  - Suporte a centenas de portais de compras com conectores específicos (utilizando Crawlee, Cheerio e Playwright já instalados no workspace).
  - Isolamento de workers em Python para extração de anexos, processamento de documentos PDF e OCR quando tecnicamente justificado.
  - Matching semântico assistido por IA e embeddings vetoriais como estratégia complementar ao matching determinístico.
  - Notificações multicanal (WhatsApp, Telegram, webhooks para clientes).
  - Personalização de marca e white label com domínios personalizados para parceiros.
  - Métricas comerciais analíticas e autosserviço de monitoramento de saúde de coletores.
- **Dependências arquiteturais:**
  - Definição de barramento de eventos ou filas para workers de processamento documental.
  - Banco vetorial ou extensão `pgvector` no PostgreSQL para embeddings.
- **Funcionalidades eventualmente antecipadas:**
  - As bibliotecas `crawlee`, `cheerio` e `playwright` já se encontram no `package.json` para facilitar a futura criação de conectores HTML, embora o conector oficial PNCP atual utilize apenas `fetch`.

### Maturidade Final (Estágio 3 — Planejada)
- **Capacidades previstas:**
  - Cobertura nacional auditável com reconciliação automática de ocorrências de múltiplas fontes.
  - Agentes autônomos de IA para inteligência competitiva e análise preditiva de compras governamentais.
  - Operação multi-tenant de alta disponibilidade, governança corporativa, SLOs rigorosos e custos segregados por tenant e por fonte de dados.
- **Requisitos de escala e governança:**
  - Extração controlada de serviços autônomos quando indicado por métricas reais de concorrência e carga.
  - Políticas de retenção de dados, replicação geográfica e plano testado de disaster recovery.

---

## 5. Estado técnico

### Aplicações existentes
- `apps/web`: Nuxt 4 (Vue 3, Nuxt UI, Tailwind CSS), páginas públicas, painel da empresa (`/app/*`), área de parceiros (`/parceiro/*`), área administrativa (`/admin/*`) e BFF em `server/`.
- `apps/api`: NestJS modular (porta 4000) com endpoints `/api/v1/*`, documentação OpenAPI em `/api/docs` e guards de identidade, tenant e administração.
- `apps/collector`: Processo Node.js TypeScript para ingestão da API do PNCP e publicação em banco.
- `apps/worker`: Processo Node.js TypeScript para consumo de outbox, enfileiramento BullMQ e execução das regras de matching.

### Banco de dados e migrations
- **SGBD:** PostgreSQL 17.
- **ORM:** Drizzle ORM com migrations SQL versionadas em `packages/database/migrations/`.
- **Migrations existentes:**
  - `0000_furry_lightspeed.sql` (criação da estrutura principal das tabelas).
  - `0001_shallow_lily_hollister.sql` (ajustes e índices consolidados).
- **Tabelas implementadas (22):**
  1. `users` — Usuários sincronizados do OIDC.
  2. `organizations` — Empresas cadastradas (limite do tenant).
  3. `organization_members` — Vínculo de usuários às empresas com papéis (`owner`, `admin`, `member`).
  4. `partners` — Entidades parceiras comerciais.
  5. `partner_clients` — Vínculo exclusivo entre empresa e parceiro.
  6. `partner_invitations` — Convites de parceiros protegidos por hash SHA-256 e expiração.
  7. `commercial_profiles` — Perfis de interesse (palavras-chave, categorias e cobertura).
  8. `municipalities` — Referência de municípios com código IBGE.
  9. `data_sources` — Catálogo de fontes oficiais monitoradas.
  10. `source_requests` — Sugestões de novos portais enviadas pelos clientes (dados passivos).
  11. `collection_runs` — Histórico de execuções e auditoria de coletas.
  12. `raw_source_records` — Payloads brutos capturados das fontes públicas com hash individual.
  13. `procurements` — Oportunidades normalizadas do catálogo global.
  14. `procurement_versions` — Histórico de versões e snapshots vinculados ao registro bruto.
  15. `saved_procurements` — Oportunidades favoritadas por organização e usuário.
  16. `opportunity_matches` — Correspondências entre perfil e licitação com pontuação e justificativa.
  17. `alert_preferences` — Configuração de recebimento e periodicidade de avisos por empresa.
  18. `alerts` — Notificações internas geradas para as empresas.
  19. `plans` — Planos cadastrados (Local, Regional, Nacional) com entitlements em JSONB.
  20. `subscriptions` — Situação da assinatura da organização (status e término de trial).
  21. `audit_logs` — Trilha de auditoria de operações sensíveis com correlation ID.
  22. `outbox_events` — Eventos transacionais gravados para despacho confiável via BullMQ.

### Integrações externas
- **PNCP:** API pública oficial (`https://pncp.gov.br/api/consulta/v1/contratacoes/atualizacao`), consumida com parâmetros de data, modalidade e paginação controlada.
- **Keycloak:** Provedor OIDC local (v26.5) rodando em Docker com importação automática do realm `radar` (`realm.json`).
- **Mailpit:** Servidor SMTP e API de inspeção de e-mails local (v1.28) na porta 8025.
- **Provedores de pagamento (PSP):** Não integrados nesta etapa.

### Infraestrutura
- `docker-compose.yml` com serviços:
  - Perfil padrão: `postgres` (PostgreSQL 17), `redis` (Redis 7 AOF), `mailpit` e `keycloak`.
  - Perfil `full`: Adiciona containers para `migrate`, `api`, `worker`, `collector` e `web`.
- Scripts auxiliares em `scripts/` (`health.mjs`, `backup.mjs`, `integration.mjs`, `wait-ready.mjs`, `scaffold-routes.mjs`).

### Comandos de desenvolvimento disponíveis
- `pnpm dev`: Inicia web, api, collector e worker concorrentemente via Turborepo.
- `pnpm build`: Compilação de todos os pacotes e aplicações.
- `pnpm typecheck`: Checagem estrita de tipos via `tsc --noEmit`.
- `pnpm lint`: Execução do ESLint e Prettier.
- `pnpm test`: Execução de testes unitários com Vitest (excluindo integração).
- `pnpm test:integration`: Cria banco PostgreSQL temporário isolado, roda migrações, sementes e suíte de persistência/tenancy.
- `pnpm test:e2e`: Testes de ponta a ponta com Playwright.
- `pnpm health`: Verificação de status das rotas e serviços locais.
- `pnpm collect`: Execução manual de coleta do PNCP.
- `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`: Gestão do banco de dados Drizzle.
- `pnpm infra:up`, `pnpm infra:down`: Gerenciamento dos containers Docker.

### Resultado dos testes nesta verificação
- **Comando executado:** `corepack pnpm test`
  - **Contexto:** Execução local na máquina de desenvolvimento via PowerShell.
  - **Resultado observado:** Falha imediata (`vitest: comando não encontrado`) acompanhada do aviso `WARN Local package.json exists, but node_modules missing, did you mean to install?`.
  - **Diagnóstico:** A pasta `node_modules` não estava presente no ambiente local, e o Docker Desktop estava inativo. Nenhum teste anterior foi reaproveitado como executado nesta sessão.

### Problemas conhecidos
1. **Documentação de validação ausente:** O arquivo `README.md` (linha 79) e `docs/roadmap/mvp.md` referenciam `docs/operations/validation.md`, porém este arquivo não existe no repositório.
2. **Rate limiting em memória:** O rate limit da API (120 req/min/IP) está configurado com armazenamento local em memória no controller Fastify/NestJS; em caso de escalonamento com múltiplas instâncias da API, o limite não é compartilhado.
3. **Limitação de paginação administrativa:** As consultas da área administrativa (`/admin/*`) utilizam `.limit(100)` fixo no banco sem paginação por cursor ou offset.

### Dúvidas técnicas relevantes
- **Estratégia de gateway de pagamento:** Qual PSP será homologado para o mercado brasileiro (Asaas, Pagar.me, Mercado Pago ou Stripe) e como será modelada a recepção de webhooks com idempotência garantida na outbox?
- **Volume da base geográfica:** A importação dos 5.570 municípios do IBGE será feita via migration SQL única ou rotina de seed separada com paginação de inserts?
- **Dimensionamento do pool de conexões:** Como será calibrado o pool do PostgreSQL (`pg`) compartilhado entre a API NestJS, o worker de matching e o collector para evitar esgotamento de conexões em ambientes com recursos restritos?

---

## 6. Próximas prioridades

> **Nota sobre o board:** Nenhum board externo (Jira, GitHub Projects, Linear) foi identificado ou conectado. A lista abaixo reflete a ordem técnica estrita de desbloqueio para a prontidão operacional e comercial do MVP.

| Ordem | Descrição | Domínio | Prioridade Técnica | Dependências | Critérios de Aceite Relevantes |
|---|---|---|---|---|---|
| **1** | Integração com provedor de pagamentos (PSP) e webhooks | Assinaturas / Billing | Alta (Bloqueador comercial) | Definição do provedor (Stripe/Asaas) | Criação de checkout seguro, recebimento idempotente de webhook assinado, transição de assinatura de trial para ativa e cancelamento. |
| **2** | Carga integral da base de municípios do IBGE | Geografia | Alta (Bloqueador funcional) | Base oficial IBGE | Carga de 5.570 municípios vinculados às 27 UFs com códigos oficiais no banco; suporte à seleção na criação de perfis comerciais. |
| **3** | Envio externo de notificações e digest por e-mail | Alertas | Média | Mailer / Transacional | Processamento agendado de preferências de alertas (diário/semanal), montagem de template com oportunidades compatíveis e envio via SMTP. |
| **4** | Edição e exclusão de perfis comerciais e dados da empresa | Comercial / Organizações | Média | API e Front-end | Endpoints `PUT/DELETE /profiles/:id` e `PUT /organizations/:id`; formulários no painel com validação de limites de plano. |
| **5** | Expansão de modalidades do PNCP e ativação do agendamento | Fontes e coleta | Média | Collector | Inclusão de modalidades adicionais (concorrência, leilão); agendamento horário ativado via variável com telemetria de taxa e erros. |
| **6** | Revisão jurídica dos termos legais e hardening de produção | Segurança / Compliance | Baixa | Parecer jurídico | Atualização das minutas de Termos e Privacidade; rate limit distribuído em Redis e configuração de variáveis para produção. |

---

## 7. Histórico resumido de alterações

- **Commit `1c4c8c5` (`first commit`):** Estrutura inicial do repositório.
- **Commit `820e163` (`initial implement`):**
  - Implementação completa do esqueleto funcional do MVP.
  - Configuração do monorepo Turborepo com 4 aplicações e 5 pacotes TypeScript strict.
  - Criação das 22 tabelas Drizzle com migrations versionadas (`0000` e `0001`) e seeds de referência.
  - Implementação do coletor incremental oficial PNCP com lock consultivo, deduplicação por hash e versionamento.
  - Implementação do Outbox Pattern, filas BullMQ e worker de matching determinístico explicável.
  - Implementação da API NestJS modular com guards OIDC (`IdentityGuard`), multi-tenancy (`TenantGuard`) e papel de administração (`PlatformAdmin`).
  - Implementação do frontend Nuxt 4 com BFF de mesma origem, sessões seladas por cookie HttpOnly, armazenamento de tokens em Redis e telas completas públicas, privadas, de parceiros e administrativas.
  - Implementação de suítes de testes unitários, testes de integração em banco isolado temporário e testes E2E com Playwright.
