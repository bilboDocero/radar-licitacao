# Observabilidade

Pino escreve JSON em stdout. A API propaga X-Correlation-Id; erros e acessos contêm esse id. Collection_runs mantém sucesso/falha, volume e duração inferível. BullMQ preserva jobs com falha e aplica tentativas finitas.

`OTEL_EXPORTER_OTLP_ENDPOINT` ativa NodeSDK com instrumentações automáticas; sem endpoint nenhum exportador é iniciado. Configure endpoint/credenciais no ambiente antes de conectar um backend OTLP. Health de dependências: `/api/v1/health`. `pnpm health` testa Web, API, PostgreSQL, Redis, OIDC e Mailpit. Métricas de custo, SLO e alertas operacionais ficam para maturidade seguinte.
