# Estado Atual do Projeto — Radar de Licitações Públicas

## 1. Identificação

- **Projeto:** Radar de Licitações Públicas (SaaS B2B2C)
- **Data da última revisão:** 12 de outubro de 2026
- **Branch analisada:** `main`
- **Commit da verificação operacional mais recente:** `6f2f39d` (`style(theme): padronizar design system SellerOS, contraste WCAG AA e suporte a light/dark mode`). A auditoria arquitetural original partiu de `820e163`.
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
  - **Docker local:** Na verificação de recuperação do login em 12/10/2026, PostgreSQL, Redis, Keycloak e Mailpit estavam em execução. A indisponibilidade estava na API, que não iniciava por ausência do vínculo local de `@radar/document-intelligence`.
  - **Verificação operacional mais recente:** `pnpm install --frozen-lockfile`, `pnpm db:migrate` e reinicialização de `pnpm dev` recuperaram a API e iniciaram web, collector e worker. A migration aditiva `0002_wild_maelstrom.sql` estava pendente e foi aplicada, preservando os cadastros. Healthcheck HTTP dos quatro serviços aprovado; login OIDC com a conta local existente `demo@radar.local` validado em Chromium, com 3 empresas vinculadas, sessão preservada após recarregar e nenhum erro JavaScript observado. Os resultados das demais suítes abaixo são históricos e não foram reexecutados nesta recuperação operacional.

---

## 2. Resumo executivo

### Próxima evolução documental — planejada em 12/10/2026

Estado da integração PDF ponta a ponta: **NOT_STARTED**. O [escopo mínimo de análise documental](roadmap/document-analysis-mvp.md) e a [ADR 0007](adr/0007-document-analysis-mvp.md) definem resumo de decisão com evidências, cinco blocos, edital/termo de referência em PDF textual, processamento inicialmente sob demanda, fila dedicada e controle de custo. OCR, tabelas complexas, chat e comprovação de habilitação ficam fora do primeiro incremento.

O próximo passo é homologar descoberta de documentos PNCP e seu inventário, seguido de extração confiável, evidências, fila/cache e avaliação manual de qualidade. Limites quantitativos, retenção e limiares de qualidade serão definidos com medição antes da liberação. Nenhuma dessas etapas foi implementada nesta atualização de documentação.

As descrições históricas de IA como domínio integralmente validado não comprovam leitura de PDFs no fluxo. A [arquitetura revisada](architecture/ai-architecture.md) registra o comportamento observado e suas lacunas; ela deve orientar a próxima entrega junto ao código.

### Verificação do fluxo de análise com Gemini — 12/10/2026

- O ambiente local foi configurado pelo usuário com Gemini (`gemini-3.5-flash-lite`); chamada real estruturada validada e resultado confirmado no navegador em uma licitação PNCP existente. As chaves permanecem exclusivamente no `.env` ignorado pelo Git.
- Após a validação inicial, as duas análises mock restantes foram regeneradas com Gemini e os três briefs existentes atualizados. Na conferência dessa operação havia três análises reais e nenhuma análise mock; isso é evidência local datada, não uma migration nem garantia sobre dados futuros.
- O cache da análise agora exige a mesma versão da licitação, provedor, modelo e versão do prompt. Resultados antigos de `mock` são regenerados sob demanda quando o provedor muda. O botão de reanálise força uma nova chamada; briefs anteriores são regenerados quando a análise compartilhada é atualizada, preservando organização e perfil.
- **Limitação confirmada no código:** o fluxo de `/app/licitacoes/:id` envia somente os dados cadastrais da licitação ao modelo. O método de download/extração de PDF existe, mas não está conectado ao `ProcurementAnalyzer`. A ativação do Gemini não representa leitura integral do edital/anexos, OCR ou validação documental da empresa. A pontuação comercial continua baseada em regras fixas.
- Validação desta alteração: 74 testes unitários aprovados (5 novos sobre cache), typecheck e build aprovados, lint dos arquivos alterados aprovado e fluxo autenticado de análise/brief aprovado. Lint global permanece com 37 erros em outros arquivos. A execução da integração em banco temporário foi recusada pelo usuário e não foi repetida.

O projeto encontra-se no estágio de **Esqueleto Funcional do MVP com Inteligência Documental Integrada**, com um fluxo vertical ponta a ponta plenamente codificado no padrão monorepo em TypeScript strict (pnpm + Turborepo).

A plataforma conta com:
- Coleta oficial da API do PNCP com controle de taxa, backoff exponencial, locks consultivos transacionais, deduplicação por hash estável e versionamento de editais.
- Publicação confiável de eventos em banco via Outbox Pattern e filas BullMQ com Redis.
- Worker de processamento em segundo plano executando algoritmo puro de matching determinístico explicável, emissão de alertas internos e orquestração assíncrona de inteligência artificial.
- Camada desacoplada de IA (`@radar/document-intelligence`) multi-provider (Mock, OpenAI, Gemini) com roteamento inteligente, extração documental, geração de Opportunity Briefs personalizados por empresa, governança orçamentária e caching compartilhado por versão de edital.
- API NestJS em monólito modular com autorização multi-tenant rigorosa baseada em associação no banco (`organization_members`), papéis de acesso e autenticação OIDC via Keycloak.
- Front-end Nuxt 4 (Vue 3, Nuxt UI, Tailwind CSS) com SSR e BFF de mesma origem que blinda tokens de acesso em Redis, gerencia sessões seladas por cookies HttpOnly e exibe o Opportunity Brief e a telemetria administrativa da IA.

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
| **Fundação** | `VALIDATED` | Monorepo pnpm 10.28.2, Turborepo, TypeScript 5.9.3 strict, 4 apps e 6 packages compartilhados; typecheck limpo em todo o workspace. | Nenhuma pendência técnica. | Manter conformidade estrita de tipos nas próximas entregas. |
| **Autenticação** | `IMPLEMENTED` | BFF OIDC com `openid-client`, PKCE, cookies selados HttpOnly (`nuxt-auth-utils`), tokens em Redis, validação JWT RS256 com JWKS via `jose` na API. | Keycloak e Mailpit exclusivos de ambiente de desenvolvimento; sem provedor IdP configurado para produção nem Single Sign-Out (SLO) global. | Homologar provedor OIDC para produção e configurar encerramento centralizado de sessão. |
| **Multi-tenancy** | `IMPLEMENTED` | `TenantGuard` valida associação em `organization_members` e papéis (`owner`, `admin`, `member`). Header `X-Organization-Id` verificado no banco; predicados em todas as queries privadas. | Sem RLS (Row-Level Security) no PostgreSQL (mitigado por camada de aplicação); sem gestão de múltiplos membros pela interface. | Implementar gestão de membros e avaliar adoção de RLS para defesa em profundidade. |
| **Organizações** | `VALIDATED` | Criação transacional atômica de organização, vínculo de proprietário, assinatura trial (14 dias, plano nacional), preferências de alertas e log de auditoria. Enriquecimento cadastral via `CompanyRegistryService` (BrasilAPI primária, fallback CNPJ.ws com rate limit no Redis, cache de 7 dias e cooldown), endpoint seguro `GET /organizations/current/registry`, rota `PATCH /organizations/current` para inclusão de CNPJ e tela `/app/empresa` com dados cadastrais e CNAEs expansíveis. | Gestão/convite de múltiplos membros pela interface web. | Implementar fluxo de convites para membros adicionais da empresa. |
| **Parceiros** | `IN_PROGRESS` | Tabelas `partners`, `partner_clients`, `partner_invitations`. Geração de convite com token SHA-256 (validade 7 dias), aceite por empresa vinculada e dashboard do parceiro. | Envio de e-mail de convite é manual (cópia de link); comissionamento, relatórios de faturamento e customização white label não implementados. | Implementar envio automático de e-mail para convite e regras de comissionamento de parceiros. |
| **Fontes e coleta** | `IN_PROGRESS` | `SourceConnector`, `PncpConnector` com fetch nativo, controle de taxa, retry exponencial, lock consultivo transacional, deduplicação por hash estável e versionamento. | Apenas modalidades 6 e 8 do PNCP; agendamento horário desativado por padrão; sem ingestão de anexos/editais (PDFs); sem conectores adicionais ativos. | Ampliar modalidades do PNCP, habilitar agendamento monitorado e homologar novos portais. |
| **Licitações** | `IMPLEMENTED` | Catálogo global em `procurements`, busca paginada com filtros (`q`, `uf`, status), rastreabilidade de versões, detalhe oficial e favoritos privados (`saved_procurements`). | Sem download, indexação ou OCR de documentos anexos; locais de execução e categorias dependem de metadados do PNCP. | Implementar extração e persistência de itens licitados e locais de execução detalhados. |
| **Matching** | `VALIDATED` | Algoritmo determinístico puro `matchProcurement` em `@radar/contracts`, cálculo assíncrono via worker com BullMQ, score explicável e persistência em `opportunity_matches`. Testes unitários aprovados. | Sem matching semântico/vetorial; correspondência baseada em substrings de palavras-chave normalizadas; sem palavras-chave negativas. | Acrescentar suporte a palavras-chave negativas e filtros por faixa de valor monetário. |
| **Inteligência Documental e IA** | `IN_PROGRESS` | Gemini real sobre metadados validado; cache por configuração e reanálise corrigidos, 5 regressões novas. Download/parser PDF e EvidenceVerifier existem como componentes auxiliares. | Descoberta PNCP, leitura PDF ponta a ponta, fila dedicada, evidências estritas, cobertura visível e orçamento concorrente ainda pendentes. OCR fora do primeiro incremento. | Executar o [MVP documental](roadmap/document-analysis-mvp.md), iniciando pela homologação do inventário PNCP. |
| **Geografia** | `IN_PROGRESS` | 27 UFs estruturadas em `@radar/contracts`, tabela `municipalities` e endpoint público `GET /geography` com aviso de dados piloto. | Apenas 5 municípios cadastrados no seed de teste (SP, RJ, DF, BH, Curitiba) em vez dos 5.570 municípios da base oficial IBGE. | Desenvolver migration/script para carga integral dos municípios do IBGE com códigos oficiais. |
| **Alertas** | `IN_PROGRESS` | Tabela `alert_preferences` (frequência diária/semanal), geração de alertas internos em `alerts` pelo worker com chave única contra duplicidade e rotas de leitura. | Notificações restritas ao painel web (in-app); disparo externo de e-mails, resumos periódicos (digest) ou canais móveis/WhatsApp inexistentes. | Construir worker de consolidação e envio externo de notificações e digest por e-mail. |
| **Assinaturas** | `IN_PROGRESS` | Tabelas `plans` (Local, Regional, Nacional) com entitlements em JSONB, verificação de direitos em `EntitlementsService`, período de avaliação de 14 dias ativo. | Módulo `billing` sem gateway de pagamento integrado (`configured: false`); sem checkout, cobrança recorrente, cancelamento ou tratamento de webhooks. | Integrar provedor de pagamento (PSP), tratar webhooks de forma idempotente e gerenciar status. |
| **Administração** | `IMPLEMENTED` | `AuditModule` e painel de IA (`/admin/inteligencia-artificial`) restritos ao papel `platform-admin`, contadores globais, monitoramento de tokens e custos, listagem de empresas, parceiros e coletores. | Consultas fixadas em limite de 100 registros recentes (`.limit(100)`) sem paginação por cursor; sem ações operacionais de retry de coleta na UI. | Implementar paginação administrativa completa e botões para disparo/reexecução de coleta. |
| **Site público e FAQ** | `VALIDATED` | Landing page, funcionalidades, planos, cobertura, FAQ, contato, termos e privacidade implementados em Nuxt 4 com identidade visual SellerOS, suporte integral e permanente a Light Mode (#FFFFFF) e Dark Mode (#0F172A), alternância no cabeçalho e conformidade com WCAG 2.2 AA (texto escuro #111827 em botões laranja #FF9900). 5 testes E2E com capturas de tela aprovados em `theme.spec.ts`. | Termos de uso e privacidade são minutas iniciais pendentes de validação jurídica; formulário de contato não envia mensagens para serviço externo. | Realizar revisão jurídica dos textos legais e integrar formulário de contato a serviço de CRM. |
| **Segurança** | `VALIDATED` | OIDC RS256 com verificação de audiência/emissor, checagem de e-mail confirmado, tokens em Redis, validação Zod estrita, Helmet, rate limit (120 req/min/IP), guarda contra SSRF (`assertApprovedUrl` + `assertSafeDestinationDns` com bloqueio estrito de IPs privados/loopback/cloud metadata) e cliente seguro `safeDownloadFile`. 13 testes unitários de segurança passando. | Rate limiting opera em memória por nó (não distribuído); RLS desativado no PostgreSQL; segredos no compose são públicos e restritos a dev. | Configurar rate limiting em Redis compartilhado e desenhar cofre de segredos para produção. |
| **Observabilidade** | `IN_PROGRESS` | Logger estruturado com Pino e redaction de credenciais/tokens/chaves de IA; telemetria de uso e custos de IA em banco; inicialização de OpenTelemetry (`startTelemetry`). | Nenhum coletor OTLP configurado no ambiente local; ausência de métricas de negócio e dashboards operacionais (Grafana/Prometheus). | Adicionar stack de observabilidade local no Compose e instrumentar contadores de negócios. |
| **Testes e CI/CD** | `VALIDATED` | 69 testes unitários passando em tempo de execução (`pnpm test`), 8 testes de integração (`pnpm test:integration`), 8 testes E2E Playwright (`app.spec.ts`, `registration.spec.ts` e `theme.spec.ts`), smoke test de IA real aprovado (`pnpm smoke:ai`), smoke test de enriquecimento cadastral aprovado (`pnpm smoke:registry`). | Testes de integração com banco isolado e E2E Playwright dependem de inicialização prévia dos containers Docker (`infra:up`). | Executar testes de integração e E2E assim que o daemon Docker for iniciado no ambiente. |

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
- **Migrations existentes (3):**
  - `0000_furry_lightspeed.sql` (criação da estrutura principal das tabelas).
  - `0001_shallow_lily_hollister.sql` (ajustes e índices consolidados).
  - `0002_wild_maelstrom.sql` (tabelas de inteligência artificial: análises, briefs, extrações e auditoria de uso/custos).
- **Tabelas implementadas (26):**
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
  23. `document_extractions` — Texto extraído, seções e hash de documentos anexos de editais.
  24. `procurement_ai_analyses` — Análise de IA pública e compartilhada por versão do edital.
  25. `opportunity_briefs` — Opportunity Brief personalizado por empresa e perfil comercial.
  26: `ai_usage_records` — Auditoria de chamadas de LLM, contagem de tokens, latência e custo em USD.

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
  - **Contexto:** Suíte de testes unitários com Vitest.
  - **Resultado observado:** Aprovado (`4 passed, 35 passed, 0 failed` em 3.50s).
  - **Detalhamento:** 10 testes de coleta PNCP (`collector.test.ts`), 10 testes de matching determinístico (`matching.test.ts`), 8 testes de inteligência artificial (`document-intelligence.test.ts` com avaliação de editais reais e roteamento de modelos) e 7 testes de contratos e sanitização/máscara de CNPJ (`contracts.test.ts`).
- **Comando executado:** `corepack pnpm test:integration`
  - **Contexto:** Suíte de integração com criação dinâmica de banco PostgreSQL temporário isolado (`persistence.test.ts`).
  - **Resultado observado:** Aprovado (`1 passed, 7 passed, 0 failed` em 3.14s).
  - **Detalhamento:** Criação atômica de empresas e proprietários, bloqueio de acesso entre tenants, deduplicação e versionamento de editais na ingestão, isolamento de favoritos, reprocessamento idempotente de jobs no worker e bloqueio de direitos após expiração de trial.
- **Comando executado:** `corepack pnpm test:e2e`
  - **Contexto:** Testes de ponta a ponta com Playwright e Chromium contra os serviços locais em execução.
  - **Resultado observado:** Aprovado (`3 passed, 0 failed` em 28.2s).
  - **Detalhamento:** Páginas públicas e fluxo vertical completo autenticado (`app.spec.ts`), layout responsivo mobile 390×844px sem overflow horizontal (`app.spec.ts`) e cadastro completo com confirmação de e-mail via Mailpit e onboarding da empresa (`registration.spec.ts`).
- **Comando executado:** `node scripts/health.mjs`
  - **Contexto:** Healthcheck das rotas e serviços locais.
  - **Resultado observado:** Aprovado (HTTP 200 para Web, API/PostgreSQL/Redis, OIDC Keycloak e Mailpit).
- **Comando executado:** `corepack pnpm smoke:ai`
  - **Contexto:** Script de verificação de conectividade e validação de saída estruturada de IA (`scripts/smoke-ai.mjs`) com provedor real configurado.
  - **Resultado observado:** Aprovado (`[SUCESSO] Resposta estruturada recebida: gemini / gemini-3.5-flash-lite`, latência 3.3s, 150 tokens in / 1.145 tokens out, custo real calculado $0.000355 USD). Requisitos fáticos e riscos extraídos em schema Zod estrito.
- **Comando executado:** `corepack pnpm -r --filter "./packages/*" --filter "./apps/*" run typecheck`
  - **Contexto:** Checagem estrita de tipos TypeScript em todas as 4 aplicações e 6 pacotes.
  - **Resultado observado:** Aprovado com zero erros de tipagem.

### Problemas conhecidos
1. **Rate limiting em memória:** O rate limit da API (120 req/min/IP) está configurado com armazenamento local em memória no controller Fastify/NestJS; em caso de escalonamento com múltiplas instâncias da API, o limite não é compartilhado.
2. **Limitação de paginação administrativa:** As consultas da área administrativa (`/admin/*`) utilizam `.limit(100)` fixo no banco sem paginação por cursor ou offset.

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
