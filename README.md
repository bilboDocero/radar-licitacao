# Radar de Licitações Públicas

Esqueleto funcional do MVP SaaS B2B2C: Nuxt 4, NestJS modular, PostgreSQL/Drizzle, Redis/BullMQ e autenticação OIDC com Keycloak. O escopo e as limitações estão em [Estado atual](docs/CURRENT_STATE.md) e [Roadmap MVP](docs/roadmap/mvp.md).

## Iniciar localmente

Requisitos: Node.js 22.14+, pnpm 10.28.2 e Docker Desktop com containers Linux. Execute na raiz deste repositório. A pasta aninhada `radar-licitacao/` preexistente não faz parte do monorepo.

```bash
npm install -g pnpm@10.28.2
cp .env.example .env
pnpm install
pnpm infra:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

No PowerShell, use `Copy-Item .env.example .env`. Se a política bloquear scripts `.ps1`, use `npm.cmd` e `pnpm.cmd`; não é necessário alterar a política do Windows. Mantenha `.env` fora do Git. Os seeds são idempotentes e não criam licitações fictícias.

| Serviço | Endereço |
|---|---|
| Aplicação | http://localhost:3000 |
| API e contratos Swagger | http://localhost:4000/api/docs |
| Health da API | http://localhost:4000/api/v1/health |
| Keycloak | http://localhost:8080 |
| E-mails locais (Mailpit) | http://localhost:8025 |

Conta local de demonstração: `demo@radar.local` / `RadarLocal123!`. Administrador da aplicação: `admin@radar.local` / `RadarAdmin123!`. Administração do Keycloak: `admin` / `admin-local`. Essas credenciais são exclusivamente locais; não representam configuração de produção.

Para testar cadastro, crie uma conta em `/cadastro`, abra o Mailpit para confirmar o e-mail e cadastre sua empresa. A avaliação de 14 dias no plano Nacional é explicitamente gratuita. Nenhuma cobrança ou ativação paga é simulada.

## Comandos

```bash
pnpm dev                  # Web, API, collector e worker
pnpm build                # Compilar todas as aplicações
pnpm typecheck            # TypeScript strict
pnpm lint                 # ESLint + Prettier
pnpm test                 # Testes unitários
pnpm test:integration     # Banco temporário isolado; exige CREATEDB local
pnpm exec playwright install chromium
pnpm test:e2e             # Serviços locais precisam estar em execução
pnpm health               # Verificar serviços e dependências
pnpm collect              # Coleta PNCP manual, com collector iniciado
pnpm db:generate          # Gerar migration após alteração do schema
pnpm db:migrate
pnpm db:seed
node scripts/backup.mjs
pnpm infra:down           # Para containers, preservando volumes
```

`pnpm test:integration` cria e remove somente um banco temporário com prefixo próprio; não usa o catálogo do desenvolvimento. Testes E2E cadastram contas/empresas claramente identificadas como teste. O schema não deve ser alterado por push: use migrations versionadas.

## Docker completo

```bash
docker compose --profile full up -d --build
```

Não execute simultaneamente com `pnpm dev` nas mesmas portas. O perfil padrão sobe apenas PostgreSQL, Redis, Keycloak e Mailpit; o perfil `full` acrescenta migração, API, web, collector e worker. O Dockerfile é de desenvolvimento. A configuração de produção é uma entrega posterior, descrita em [deployment](infrastructure/deployment/README.md).

## Coleta e informações oficiais

O coletor consulta atualização de pregão eletrônico e dispensa na API do PNCP. Pagina, registra brutos, deduplica por origem/identificador, versiona e publica eventos transacionais. O cursor só avança após sucesso; a primeira janela padrão é de dois dias. A coleta automática está desligada por padrão; ative `COLLECTION_ENABLED=true` para o agendamento horário.

A API externa pode responder 429 ou ficar indisponível. Nesse caso, o job falha após tentativas limitadas e a execução fica registrada. Não há cobertura integral do PNCP, de todos os portais ou promessa de tempo real. A localização do órgão não é considerada local obrigatório de entrega.

## Organização

- `apps/web`: Nuxt, páginas públicas/privadas, layouts, BFF, sessão e Opportunity Brief.
- `apps/api`: módulos de identidade, organizações, perfis, catálogo, planos, parceiros, administração e inteligência artificial (`document-intelligence`).
- `apps/collector`: conector oficial PNCP, normalização, ingestão e job de coleta.
- `apps/worker`: publicação da outbox, matching explicável, avisos internos e orquestração de IA.
- `packages`: contracts, database, source-sdk, events, config e document-intelligence.
- `tests`: domínio, integração, navegador e orientação de carga.
- `docs`: arquitetura, ADRs, segurança, operação e três estágios de evolução.

Consulte [AGENTS.md](AGENTS.md), [arquitetura](docs/architecture/overview.md), [módulos](docs/architecture/modules.md), [API](docs/api/README.md), [segurança](docs/security/local.md) e [validação](docs/operations/validation.md).

## Limites desta entrega

Pagamentos, alertas externos, edição completa de cadastros, gestão de membros, todos os municípios IBGE, documentos/OCR/IA e white label permanecem pendentes. As páginas correspondentes informam suas limitações. Termos e privacidade são minutas locais e precisam de revisão antes do lançamento. Build e testes aprovados não equivalem a prontidão comercial.
