# Validação e Resultados Operacionais

Este documento consolida os comandos de validação da plataforma Radar de Licitações Públicas e o histórico de resultados observados.

## Preparação documental da próxima entrega — 12/10/2026

Atualizados roadmap, arquitetura e estado atual, com ADR 0007 e plano específico do MVP documental. Esta entrega é apenas documental; não conecta PDFs ao Gemini nem modifica contratos/schema. Os testes anteriores abaixo não validam a evolução planejada. Sua matriz de homologação está em [análise documental MVP](../roadmap/document-analysis-mvp.md#validação-de-qualidade-e-liberação).

## Ativação de Gemini e invalidação de cache — 12/10/2026

- Operação posterior: duas análises mock restantes regeneradas com Gemini, três briefs atualizados e contagem final de análises mock igual a zero. A operação atualizou dados locais; scripts auxiliares e credenciais não integram o commit.

- `pnpm smoke:ai`: chamada real com `gemini-3.5-flash-lite` aprovada; retorno estruturado validado pelo schema, 150 tokens de entrada e 960 de saída. O texto desse smoke é uma fixture explícita, não um edital coletado.
- Fluxo autenticado em Chromium: licitação PNCP `0a86b6a9-99d6-42df-a943-36043faabf34`, anteriormente identificada com análise `mock`, retornou `provider=gemini`, `model=gemini-3.5-flash-lite`, `status=COMPLETED`; brief compatível com a análise e texto exibido na página de detalhes. O processamento continua restrito ao resumo cadastral, sem download de PDF.
- `pnpm test`: 74 testes aprovados, incluindo 5 regressões de troca de provedor/modelo, reutilização de cache válido, reanálise forçada e atualização de brief preservando o tenant/perfil.
- `pnpm typecheck` e `pnpm build`: aprovados. ESLint dos quatro arquivos de código/teste alterados: aprovado. `pnpm lint` global: reprovado com 37 erros e 255 avisos em outros arquivos, incluindo imports não utilizados e `any`; não foi aplicada formatação ou correção geral fora do escopo.
- Teste de integração com IA simulada em banco temporário: execução recusada pelo usuário, não repetida. Não foi executada novamente a suíte completa E2E; a validação de navegador acima foi direcionada ao fluxo alterado.
- API e worker recarregaram as configurações pelo watcher após as alterações. Healthcheck local aprovado; não houve exclusão de dados ou migration de schema nesta alteração.

## Recuperação do ambiente local — 12/10/2026

- **Sintoma:** login de conta existente redirecionava para `/entrar?erro=servico_indisponivel`; web e Keycloak respondiam, mas a API na porta 4000 estava indisponível.
- **Diagnóstico:** inicialização da API falhava com `ERR_MODULE_NOT_FOUND` para `@radar/document-intelligence`. PostgreSQL já continha 5 usuários, 6 organizações, 4 associações, 3 planos e 4 assinaturas; o registro de migrations tinha somente as versões `0000` e `0001`.
- **Recuperação:** `pnpm install --frozen-lockfile` sincronizou as dependências; `pnpm db:migrate` aplicou a migration aditiva `0002`; `pnpm dev` reiniciou web, API, worker e collector. Não houve reset de banco nem recriação dos usuários.
- **Validação:** `node scripts/health.mjs` retornou HTTP 200 para web, API (incluindo PostgreSQL/Redis), OIDC e Mailpit. Verificação de navegador com Playwright/Chromium e `demo@radar.local` aprovou login OIDC real, acesso ao painel, respostas 200 dos endpoints de identidade e organizações pelo BFF, leitura das 3 empresas vinculadas e sessão preservada após recarregar, sem erros JavaScript.
- **Escopo:** recuperação operacional, sem alteração de código da aplicação. As suítes completas de lint, tipos, build, testes unitários e integração não foram reexecutadas; os registros seguintes pertencem às validações anteriores.

---

## 1. Roteiro de Verificação

### 1.1. Verificação Estática de Tipagem (TypeScript Strict)
```bash
# Executa checagem de tipos em todos os pacotes e aplicações
pnpm -r --filter "./packages/*" --filter "./apps/*" run typecheck
```
- **Resultado Observado:** Aprovado em todos os 6 pacotes (`@radar/contracts`, `@radar/database`, `@radar/events`, `@radar/source-sdk`, `@radar/config`, `@radar/document-intelligence`) e 4 aplicações (`@radar/web`, `@radar/api`, `@radar/collector`, `@radar/worker`) com **0 erros**.

### 1.2. Testes Unitários de Domínio e Segurança (Vitest)
```bash
pnpm test
```
- **Resultado Observado:** 6 arquivos de teste e 60 testes aprovados (100% de sucesso):
  - `tests/unit/ssrf-security.test.ts` (13 testes): bloqueio de IPs privados, loopback (IPv4/IPv6), link-local/cloud metadata (169.254.169.254), protocolos não-HTTP, credenciais embutidas, portas anômalas, DNS rebinding e limite de download seguro (maxBytes).
  - `tests/unit/document-pipeline.test.ts` (12 testes): segmentação temática com metadados estruturados de chunking (id, ordem, hash, páginas, tokens), extração de texto em buffer, auditoria e rebaixamento de citações alucinadas com `EvidenceVerifier`, e simulação de falhas do `MockAIProvider` (timeout, rate limit 429, 503, JSON malformado e failover do router).
  - `tests/unit/collector.test.ts` (10 testes): hashing canônico estável, proteção SSRF de URLs, normalização do fuso de Brasília e paginação do PNCP.
  - `tests/unit/matching.test.ts` (10 testes): algoritmo determinístico de matching, prioridade de local de execução vs. sede do órgão, normalização de acentos e descarte de prazos vencidos.
  - `tests/unit/document-intelligence.test.ts` (8 testes): Mock AI Provider, geração de Opportunity Briefs, roteador com failover automático, segmentação de seções documentais e avaliação com editais reais (TI, Obras e órgãos sem local definido).
  - `tests/unit/contracts.test.ts` (7 testes): validação e sanitização de CNPJ (com e sem formatação), conversão de espaços, máscara dinâmica progressiva e formatação para exibição.

### 1.3. Teste de Fumaça de Inteligência Artificial
```bash
pnpm smoke:ai
```
- **Resultado Observado:** Execução bem-sucedida do script `scripts/smoke-ai.mjs`.
  - Provedor resolvido: `gemini` (modelo real homologado: `gemini-3.5-flash-lite`).
  - Latência: ~3.3 s.
  - Consumo: 150 tokens de entrada / 1.145 tokens de saída (total: 1.295).
  - Custo em USD: $0.000355.
  - Validação Zod: Schema `tenderRequirementsExtractionSchema` validado com 6 requisitos extraídos (objeto, modalidade, habilitação jurídica, regularidade fiscal, capacidade técnica e prazo de impugnação) e 1 risco identificado.

### 1.4. Testes de Integração com Banco Isolado
```bash
pnpm test:integration
```
- **Pré-requisito:** PostgreSQL local iniciado (`pnpm infra:up`).
- **Mecanismo:** O runner `scripts/integration.mjs` cria um banco temporário isolado (`CREATE DATABASE radar_test_<uuid>`), executa as migrações, sementes, roda a suíte `tests/integration/persistence.test.ts` e descarta o banco com `DROP DATABASE ... WITH (FORCE)`.

### 1.5. Testes End-to-End (Playwright)
```bash
pnpm exec playwright install chromium
pnpm test:e2e
```
- **Pré-requisito:** Todos os serviços iniciados (`pnpm infra:up` e `pnpm dev`).
- **Cobertura:** Navegação pública, login OIDC via Keycloak, interceptação de e-mail de confirmação no Mailpit, onboarding da empresa, criação de perfil comercial, busca no radar de oportunidades e teste de responsividade mobile (390×844px).

### 1.6. Healthcheck de Serviços Locais
```bash
pnpm health
```
- Verifica as rotas HTTP locais da Web (porta 3000), API (porta 4000), Keycloak OIDC (porta 8080) e Mailpit (porta 8025).
