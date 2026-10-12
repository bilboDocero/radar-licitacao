# Radar de Licitações — Manual Operacional dos Agentes

## 1. Identidade do projeto

- **Nome e propósito:** Radar de Licitações Públicas — plataforma SaaS B2B2C que conecta fornecedores a oportunidades de compras governamentais com monitoramento automatizado e matching inteligente.
- **Público-alvo:** Fornecedores de compras públicas (empresas de pequeno, médio e grande porte) e parceiros comerciais (escolas, consultorias e especialistas em licitações).
- **Modelo de negócio:** SaaS B2B2C com planos por cobertura geográfica (Local, Regional e Nacional) e canal de parcerias com convites vinculados.
- **Estágio atual:** Esqueleto funcional do MVP, com fluxo vertical ponta a ponta implementado (coleta, ingestão, outbox, worker de matching, API modular, BFF e painel web) e pendências comerciais/operacionais restantes (pagamento, cobertura IBGE integral, envio externo de alertas).
- **Objetivo do MVP:** Validar o ciclo completo de monitoramento, matching determinístico explicável e gestão de oportunidades antes da operação comercial e cobrança real.

## 2. Stack e arquitetura

### Implementação confirmada no repositório
- **Front-end:** Nuxt 4 (Vue 3, TypeScript strict, Nuxt UI, Tailwind CSS); SSR para páginas privadas; BFF integrado para proxy seguro de API e proteção de tokens.
- **BFF & Autenticação:** `openid-client` com fluxo Authorization Code + PKCE + state + nonce; sessão selada via cookies HttpOnly (`nuxt-auth-utils`); armazenamento e rotação de tokens em Redis; validação de identidade na API via `jose` com JWKS (Keycloak local para desenvolvimento).
- **Back-end:** NestJS no padrão monólito modular (API `/api/v1`), com autorização por associação à organização (`organization_members`) e papéis (`owner`, `admin`, `member`), além de controle administrativo por claims (`platform-admin`).
- **Banco de dados & ORM:** PostgreSQL 17 + Drizzle ORM com migrations SQL versionadas; 22 tabelas implementadas e consolidadas.
- **Mensageria & Filas:** Redis 7 + BullMQ para agendamento de coleta (`radar-collection`), publicação confiável via Outbox Pattern e processamento assíncrono de matching (`radar-matching`).
- **Coleta oficial:** TypeScript com `fetch` nativo consumindo API oficial do PNCP (`/contratacoes/atualizacao`), com controle de taxa, backoff exponencial, locks consultivos (`pg_advisory_xact_lock`), versionamento e deduplicação de registros brutos.
- **Bibliotecas auxiliares instaladas:** Crawlee, Cheerio e Playwright instalados para homologação futura de conectores que exijam crawling de portais específicos.
- **Pacotes compartilhados:** Monorepo pnpm + Turborepo (`packages/contracts`, `packages/database`, `packages/events`, `packages/source-sdk`, `packages/config`).

### Fronteiras e decisões arquiteturais (ADRs)
- `ADR 0001 — Monólito modular`: NestJS centraliza as regras de negócio em uma API única; worker e collector são processos auxiliares da mesma plataforma, não microsserviços distribuídos.
- `ADR 0002 — TypeScript primeiro`: Tipagem única compartilhada via Zod; Python só será admitido futuramente em processos isolados caso haja necessidade técnica comprovada para OCR ou processamento de PDFs.
- `ADR 0003 — Coleta compartilhada`: Licitações são globais e coletadas uma única vez por fonte/identificador externo; tenants compartilham o catálogo e recebem correspondências privadas.
- `ADR 0004 — Tenant por organização`: A organização (`organizations.id`) é a fronteira estrita de isolamento de dados. Header `X-Organization-Id` é seleção de contexto, nunca permissão; validação é sempre feita pela associação do usuário no banco.
- `ADR 0005 — Keycloak e BFF`: Sessão e tokens sensíveis não trafegam nem são expostos no cliente JavaScript.
- `ADR 0006 — Inteligência Documental e Arquitetura Multi-Provider de IA`: Arquitetura agnóstica e desacoplada (`@radar/document-intelligence`), processamento compartilhado de editais por versão, Opportunity Brief personalizado e controle rigoroso de custos e evidências.

## 3. Organização do código

### Aplicações (`apps/`)
- `apps/web`: Nuxt 4, páginas públicas, painel autenticado (`/app/*`), área de parceiros (`/parceiro/*`), área administrativa (`/admin/*`), layouts, componentes, composables e BFF em `server/`.
- `apps/api`: API NestJS modular com rotas `/api/v1`. Módulos: `identity`, `tenancy`, `organizations`, `partners`, `commercial-profiles`, `geography`, `sources`, `procurements`, `matching`, `alerts`, `notifications`, `subscriptions`, `billing`, `audit`, `document-intelligence`.
- `apps/collector`: Processo de coleta e ingestão da fonte oficial PNCP; conector, normalizadores, deduplicação e jobs BullMQ.
- `apps/worker`: Processo de background; leitor periódico de outbox (`outbox_events`), publicação no BullMQ, execução do algoritmo determinístico de matching, geração de alertas internos e orquestração assíncrona de inteligência artificial.

### Pacotes compartilhados (`packages/`)
- `packages/contracts`: Schemas Zod, tipos TypeScript canônicos, contratos de entrada/saída, validação OpenAPI, função de matching puro determinístico (`matchProcurement`) e schemas de IA (`procurementAIAnalysisSchema`, `opportunityBriefSchema`).
- `packages/database`: Schemas Drizzle de todas as 26 tabelas, conexão PostgreSQL, migrações SQL versionadas e rotina de seed de referência.
- `packages/events`: Definição de nomes de filas BullMQ (`radar-collection`, `radar-matching`, `radar-intelligence`) e schemas Zod de eventos da outbox.
- `packages/source-sdk`: Interfaces para conectores de coleta (`SourceConnector`), cálculo de hash estável (`stableHash`) e guardas de segurança SSRF (`assertApprovedUrl`).
- `packages/document-intelligence`: Módulo desacoplado de IA contendo adapters multi-provider (`MockAIProvider`, `OpenAIProvider`, `GeminiProvider`), roteador dinâmico (`AIModelRouter`), controle orçamentário (`AIUsageTracker`), extração documental e gerador de Opportunity Briefs.
- `packages/config`: Validação de variáveis de ambiente com Zod (incluindo parâmetros de IA e provedores), logger estruturado com Pino (redaction de credenciais) e inicialização de OpenTelemetry.

### Regras de importação e dependências
- Dependências são estritamente unidirecionais: aplicações importam pacotes de workspace (`@radar/*`), mas pacotes **nunca** importam aplicações e não criam referências circulares.
- Em código Node.js de servidor compilado com TypeScript ESM, imports relativos de arquivos locais devem obrigatoriamente incluir a extensão `.js` (ex.: `import { db } from './database.module.js'`).
- Rotas e controllers com regras transacionais devem delegar para serviços de domínio; não coloque regras de negócio ou mutações de estado diretamente em componentes Vue.

## 4. Regras obrigatórias dos agentes

### Antes de implementar
1. Ler este `AGENTS.md` e consultar `docs/CURRENT_STATE.md`.
2. Consultar `docs/roadmap/mvp.md`, `intermediate.md` e `mature.md` (não existem arquivos raiz `MATURITY_MODEL.md` ou `ROADMAP.md`).
3. Consultar o board de desenvolvimento quando houver acesso. Atualmente nenhum board está conectado/verificado: não invente IDs, prioridades ou responsáveis.
4. Identificar o módulo e a aplicação responsáveis pela alteração antes de criar novos arquivos.
5. Inspecionar implementações, schemas, testes e migrations correlatas.
6. Avaliar impactos no isolamento multi-tenant e nos contratos da API.
7. Planejar a menor alteração técnica necessária e suficiente.

### Durante a implementação
- Não reescrever funcionalidades existentes nem alterar contratos vigentes sem justificativa real.
- Não duplicar entidades, schemas, componentes ou serviços.
- Não adicionar novas dependências ao `package.json` sem necessidade técnica estrita.
- Não introduzir microsserviços, novos bancos ou runtimes alternativos (ex.: Python) no escopo atual.
- Não executar migrations destrutivas (`drop column`, `drop table`, `cascade`) sem aprovação explícita.
- Não criar tabelas ou endpoints fictícios; não assumir dados mockados como prontidão comercial.
- Preservar rigorosamente o multi-tenancy: sempre filtrar recursos privados pelo predicado de `organizationId` validado pelo `TenantGuard`.
- Nunca transformar sugestões de fontes de usuários em chamadas HTTP dinâmicas ou desprotegidas contra SSRF.
- Nunca simular pagamentos ou faturamento ativo enquanto não houver integração formal com gateway homologado.
- Respeitar os limites do MVP definidos no roadmap.
- Preservar a codificação UTF-8 em todos os arquivos. Não formatar os anexos `estrategia.md` e `memoria.md`.

### Depois da implementação
1. Executar os testes automatizados pertinentes (`pnpm test`, `pnpm test:integration`, `pnpm test:e2e`).
2. Executar validação estática: `pnpm typecheck`, `pnpm lint` e `pnpm build`.
3. Validar a integridade de migrations e schemas com `pnpm db:migrate`.
4. Atualizar as seções pertinentes de `docs/CURRENT_STATE.md` caso o estado, contratos ou limitações tenham mudado.
5. Se uma nova fronteira ou convenção foi estabelecida, documentar através de uma nova ADR em `docs/adr/`.
6. Nunca anunciar conclusões, coberturas ou aprovações de testes que não foram efetivamente executados e verificados.

## 5. Hierarquia de fontes de verdade

Em caso de divergência entre artefatos do projeto, adote a seguinte ordem de precedência:
1. **Código-fonte, migrations e testes:** refletem o comportamento e o estado real da implementação.
2. **ADRs aprovadas (`docs/adr/`):** fundamentam as decisões arquiteturais estabelecidas.
3. **Roadmap de maturidade (`docs/roadmap/`):** define a intenção de produto e os limites de cada estágio.
4. **Board de desenvolvimento:** fonte primária de tarefas, prioridades e backlog quando acessível (atualmente não configurado).
5. **`docs/CURRENT_STATE.md`:** síntese fotográfica verificada do estado técnico e das pendências.
6. **`AGENTS.md`:** guia operacional de conduta e governança dos agentes de IA.

Ao identificar divergência entre documentação e código, registre explicitamente a diferença no relatório e no `CURRENT_STATE.md` para alinhamento.

## 6. Protocolo permanente de atualização do CURRENT_STATE.md

Os agentes de desenvolvimento devem manter o arquivo `docs/CURRENT_STATE.md` como uma fotografia fidedigna do projeto. Atualize o documento sempre que uma entrega:
- Alterar o estado de implementação ou validação de qualquer um dos 16 domínios.
- Modificar o schema do banco de dados, migrations ou contratos da API (`@radar/contracts`).
- Integrar uma nova ferramenta externa, gateway, provedor OIDC ou conector de coleta.
- Resolver ou introduzir um bloqueio técnico para o lançamento do MVP.
- Atingir ou avançar em um marco de maturidade.

Não faça alterações cosméticas no `docs/CURRENT_STATE.md` e nunca apague pendências conhecidas sem comprovação objetiva no código e nos testes.

## 7. Comandos de desenvolvimento e verificação

```bash
# Instalação e ambiente
pnpm install
cp .env.example .env          # No Windows: Copy-Item .env.example .env
pnpm infra:up                 # Inicia PostgreSQL, Redis, Mailpit e Keycloak locais

# Banco de dados
pnpm db:generate              # Gera migration no @radar/database
pnpm db:migrate               # Executa migrations pendentes
pnpm db:seed                  # Injeta planos, fontes e dados geográficos base

# Desenvolvimento e execução
pnpm dev                      # Inicia apps em modo dev (web, api, collector, worker)
pnpm collect                  # Dispara job de coleta PNCP manual

# Verificação e qualidade
pnpm typecheck                # Validação de tipos TypeScript strict
pnpm lint                     # ESLint + verificação Prettier
pnpm test                     # Testes unitários Vitest
pnpm test:integration         # Teste de integração em banco temporário isolado
pnpm test:e2e                 # Testes de ponta a ponta com Playwright
pnpm build                    # Compilação de todos os pacotes e aplicações
pnpm health                   # Health check das dependências e serviços locais
```

*Nota para ambientes Windows:* Caso a execução de scripts seja restrita pela política de execução do PowerShell, utilize `pnpm.cmd` ou execute comandos via `corepack pnpm <comando>`.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
