# ADR 0001 — Monólito modular

Status: aceito. NestJS concentra os domínios em uma única API. Coleta e trabalho assíncrono executam em processos separados por seu ciclo de vida, sem introduzir serviços de domínio remotos. Isso facilita transações e operação do MVP. Extração de serviços exige evidência de carga ou autonomia operacional.
