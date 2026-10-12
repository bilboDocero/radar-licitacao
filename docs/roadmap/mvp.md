# Entrega do esqueleto MVP

## Implementado

- Fundação pnpm/Turbo/TS strict, Nuxt UI/Tailwind, NestJS, Drizzle e Compose.
- 26 tabelas justificadas, 3 migrations versionadas, dados de referência sem licitações simuladas.
- OIDC local com cadastro/verificação/recuperação; onboarding de empresa e associação owner.
- Perfis comerciais, limites parametrizáveis, avaliação explícita de 14 dias.
- PNCP incremental (duas modalidades), brutos, hash, versões, catálogo e filtros paginados.
- Matching determinístico explicável, favoritos, notificações internas e preferência.
- Enriquecimento cadastral empresarial com BrasilAPI e fallback CNPJ.ws com cache de 7 dias e máscara dinâmica de CNPJ.
- IA com adapters Mock, OpenAI e Gemini; chamada real Gemini validada sobre metadados, Opportunity Brief por empresa e auditoria de uso. Download/parser PDF existem como componentes auxiliares, sem integração documental ponta a ponta.
- Parceiros, carteira limitada, convites com hash/expiração/aceite e marca inicial.
- Áreas públicas e privadas, estados de erro/vazio/carregamento, tema e responsividade.
- Consulta administrativa, observabilidade de IA e custos, cadastro de parceiro, auditoria e contratos OpenAPI.
- Testes de domínio, persistência/tenancy, E2E, CI e documentação operacional.

## Ainda necessário antes de operar comercialmente

- Configurar e validar PSP sandbox/produção, webhook assinado/idempotente, preços e gestão de cancelamento. Nenhuma cobrança foi simulada.
- Importar todos os municípios IBGE, ampliar modalidades/fontes/backfill e homologar cobertura com evidência operacional.
- Editar/excluir perfis, convidar/gerenciar membros, editar empresas e gerenciar planos/fontes pela interface.
- Envio externo de alertas e resumos na frequência escolhida. Hoje os avisos são internos; frequência fica preparada para digest futuro.
- Integrar descoberta PNCP, download e leitura de edital/termo de referência ao Gemini, com evidências, cobertura explícita e limites de custo. Hoje a análise usa somente metadados. Escopo da próxima entrega em [MVP de análise documental](document-analysis-mvp.md).
- Operação de retry/replay e homologação assistida no painel; paginação administrativa além dos 100 registros recentes.
- Operador, suporte, revisão dos textos legais/privacidade, retenção de dados, segredos e hardening de produção.
- Observabilidade OTLP com destino configurado, monitoramento, restore ensaiado e revisão de carga.

Cada página correspondente informa sua limitação. Estrutura inicial não equivale a funcionalidade comercial concluída. Consulte `docs/operations/validation.md` para o resultado observado dos comandos.

## Próxima entrega de inteligência documental — planejada

Resumo de decisão com evidências em cinco blocos: objeto/escopo, prazos, exigências de participação, condições operacionais e pontos de atenção. Processamento inicialmente sob demanda, somente de edital e termo de referência em PDF textual. OCR, chat livre, tabelas complexas e comprovação de habilitação ficam fora desta entrega.

A [ADR 0007](../adr/0007-document-analysis-mvp.md) e o [plano de implementação e aceite](document-analysis-mvp.md) distinguem as capacidades existentes das pendentes e definem o controle de cache, fila, orçamento e qualidade.
