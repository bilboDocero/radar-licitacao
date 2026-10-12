# Entrega do esqueleto MVP

## Implementado

- Fundação pnpm/Turbo/TS strict, Nuxt UI/Tailwind, NestJS, Drizzle e Compose.
- 26 tabelas justificadas, 3 migrations versionadas, dados de referência sem licitações simuladas.
- OIDC local com cadastro/verificação/recuperação; onboarding de empresa e associação owner.
- Perfis comerciais, limites parametrizáveis, avaliação explícita de 14 dias.
- PNCP incremental (duas modalidades), brutos, hash, versões, catálogo e filtros paginados.
- Matching determinístico explicável, favoritos, notificações internas e preferência.
- Inteligência Artificial & Análise Documental (multi-provider: Mock, OpenAI, Gemini): extração de requisitos, Opportunity Brief personalizado por empresa e controle orçamentário.
- Parceiros, carteira limitada, convites com hash/expiração/aceite e marca inicial.
- Áreas públicas e privadas, estados de erro/vazio/carregamento, tema e responsividade.
- Consulta administrativa, observabilidade de IA e custos, cadastro de parceiro, auditoria e contratos OpenAPI.
- Testes de domínio, persistência/tenancy, E2E, CI e documentação operacional.

## Ainda necessário antes de operar comercialmente

- Configurar e validar PSP sandbox/produção, webhook assinado/idempotente, preços e gestão de cancelamento. Nenhuma cobrança foi simulada.
- Importar todos os municípios IBGE, ampliar modalidades/fontes/backfill e homologar cobertura com evidência operacional.
- Editar/excluir perfis, convidar/gerenciar membros, editar empresas e gerenciar planos/fontes pela interface.
- Envio externo de alertas e resumos na frequência escolhida. Hoje os avisos são internos; frequência fica preparada para digest futuro.
- Documentos/itens oficiais, categorização, extração de locais de execução e detalhamento de categorias. Sem análise documental no MVP atual.
- Operação de retry/replay e homologação assistida no painel; paginação administrativa além dos 100 registros recentes.
- Operador, suporte, revisão dos textos legais/privacidade, retenção de dados, segredos e hardening de produção.
- Observabilidade OTLP com destino configurado, monitoramento, restore ensaiado e revisão de carga.

Cada página correspondente informa sua limitação. Estrutura inicial não equivale a funcionalidade comercial concluída. Consulte `docs/operations/validation.md` para o resultado observado dos comandos.
