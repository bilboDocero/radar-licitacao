# Painel de Debug e Controle de Background (`/app/debug`)

Este documento especifica a operação da aba de depuração e controle manual de processos em segundo plano do Radar de Licitações Públicas.

---

## 1. Propósito e Arquitetura

O painel de depuração foi desenvolvido para permitir o controle manual, inspeção em tempo real e testes ponta a ponta de todos os processos em segundo plano da plataforma diretamente pela interface web, sem a necessidade de recorrer à linha de comando (`pnpm collect`, scripts avulsos ou queries SQL).

A funcionalidade é orientada por **Feature Flag** no ambiente:
- Quando ativada (`DEBUG_MODE=true`), a rota `/app/debug` fica acessível e o link **"Debug & Background"** aparece no menu lateral para todas as organizações.
- Quando desativada (`DEBUG_MODE=false`), a rota no Nuxt redireciona para `/app` e os endpoints de debug na API NestJS retornam `404 Not Found` via `DebugGuard`.

---

## 2. Como Ativar ou Desativar

No arquivo `.env` na raiz do projeto:

```env
# Ativar o painel de debug (aceita: true, on, 1)
DEBUG_MODE=true

# Desativar para modo padrão/produção (aceita: false, off, 0)
DEBUG_MODE=false
```

Após alterar o `.env`, reinicie os processos de desenvolvimento (`pnpm dev`).

---

## 3. Recursos Disponíveis no Painel

O painel está organizado em 5 blocos estratégicos:

### 3.1. Coletor Oficial do PNCP
- **Métricas Visíveis:** Status da última execução (`collection_runs.status`), data/hora de início e término, total de registros ingeridos e o cursor de data atual salvo em `data_sources`.
- **Ações Disponíveis:**
  - `[ Executar Coleta do PNCP Agora ]`: Dispara o job de coleta na fila BullMQ `radar-collection` e consome a API oficial do PNCP (`/contratacoes/atualizacao`), atualizando o catálogo local.
  - `[ Resetar Cursor de Data ]`: Volta o cursor de busca para 2 dias atrás, permitindo re-coletar e reprocessar editais recentes.

### 3.2. Outbox e Filas BullMQ
- **Métricas Visíveis:** Contador de eventos na tabela `outbox_events` aguardando despacho (`dispatchedAt IS NULL`), total de eventos já despachados e tabela com os últimos 6 eventos gerados.
- **Ações Disponíveis:**
  - `[ Forçar Despacho da Outbox Imediato ]`: Processa e publica imediatamente os eventos pendentes para as filas do BullMQ no Redis, sem aguardar o intervalo do timer de 2 segundos.

### 3.3. Motor de Matching e Alertas
- **Métricas Visíveis:** Total de oportunidades compatíveis geradas (`opportunity_matches`) para a organização ativa e alertas registrados.
- **Ações Disponíveis:**
  - `[ Re-executar Matching da Minha Empresa ]`: Emite o evento `profile.changed` para a empresa ativa, recalculando imediatamente a aderência comercial contra todas as licitações abertas no banco.
  - `[ Simular Alerta de Teste ]`: Injeta uma notificação na caixa de entrada da empresa ativa para testar a renderização da central de alertas.

### 3.4. Inteligência Documental & IA
- **Métricas Visíveis:** Provedor ativo (`gemini`, `openai` ou `mock`), modelo configurado (`gemini-3.5-flash-lite`), total de análises e briefs salvos, e resumo de consumo (tokens totais e custo em USD).
- **Ações Disponíveis:**
  - `[ Executar Smoke Test com [PROVEDOR] ]`: Executa uma inferência de teste em tempo real com a LLM ativa e exibe a resposta estruturada na tela, com latência em milissegundos, contagem de tokens de entrada/saída e custo em USD.
  - `[ Limpar Cache de Análises no Banco ]`: Purga as análises da tabela `procurement_ai_analyses` para testar novas inferências.

### 3.5. Enriquecimento Cadastral (CNPJ)
- **Métricas Visíveis:** Saldo restante da cota de 3 consultas por minuto da API pública CNPJ.ws.
- **Ações Disponíveis:**
  - `[ Limpar Cache de CNPJ no Redis ]`: Remove as chaves de cache `company_registry:*` do Redis e reseta a contagem de taxa do CNPJ.ws.
  - Link de atalho direto para a tela de Dados da Empresa (`/app/empresa`).

---

## 4. Endpoints da API

Todos os endpoints da API pertencem ao `DebugModule` e são protegidos por `DebugGuard` e `TenantGuard`:

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/debug/status` | Retorna o status consolidado de coletor, outbox, matching, IA e Redis. |
| `POST` | `/api/v1/debug/collector/trigger` | Enfileira a execução manual de coleta do PNCP. |
| `POST` | `/api/v1/debug/collector/reset-cursor` | Redefine o cursor de data para lookback configurável. |
| `POST` | `/api/v1/debug/outbox/drain` | Despacha em lote eventos pendentes da outbox para o BullMQ. |
| `POST` | `/api/v1/debug/matching/reindex` | Dispara o recálculo de matching da organização ativa. |
| `POST` | `/api/v1/debug/ai/smoke` | Executa inferência estruturada em tempo real com a LLM. |
| `POST` | `/api/v1/debug/cache/clear-ai` | Purga análises e briefs do banco de dados. |
| `POST` | `/api/v1/debug/cache/clear-cnpj` | Limpa chaves de cache de empresas e rate limits no Redis. |
| `POST` | `/api/v1/debug/alerts/simulate` | Cria um alerta interno de teste para a empresa ativa. |

## 5. Controles avançados: campos e uso

Todos os controles abaixo só existem enquanto `DEBUG_MODE=true` ou `DEBUG=on`. As ações de fila e IA são assíncronas: a resposta informa `jobId` e o resultado pode ser acompanhado atualizando o status.

| Recurso | Campos | Como usar | Efeito técnico e limites |
|---|---|---|---|
| Alternar coleta automática | `enabled: boolean` | Use `true` para criar/atualizar o scheduler `pncp-hourly`; use `false` para removê-lo. | Persiste override no Redis; não altera `.env` e não bloqueia coleta manual. |
| Estado BullMQ | Nenhum | Atualize o painel. | Retorna `waiting`, `active`, `delayed`, `failed` e `completed` de `radar-collection` e `radar-matching`. |
| Reprocessar jobs falhos | `queue: collection \| matching` | Selecione a fila e use **Reprocessar falhos**. | Executa `job.retry('failed')` para até 100 jobs. |
| Limpar jobs falhos | `queue: collection \| matching` | Use somente após diagnosticar os erros. | Remove até 1.000 jobs failed da fila; não remove outbox nem dados persistidos. |
| Matching de um edital | `procurementId: UUID` | Informe o UUID e execute o reindexamento. | Enfileira `procurement.changed`; o worker cruza o edital com os perfis ativos. |
| Análise documental | `procurementId: UUID` | Informe o UUID e execute a análise. | Enfileira `procurement.ai.analyze` usando a versão atual; respeita cache, orçamento e evidências. |
| Regenerar Brief | `procurementId: UUID`, `profileId?: UUID` | Informe o edital; informe o perfil apenas quando quiser selecionar um específico. | Valida que o perfil pertence à organização ativa e enfileira `opportunity.brief.generate`. |
| Ver JSON do Brief | Query `procurementId: UUID` | Informe o edital e clique em **Ver JSON bruto**. | Retorna somente o Brief da organização ativa; não expõe Brief de outro tenant. |
| Falha do Mock | `mode` | Selecione `none`, `rate_limit_429`, `timeout`, `temporary_503`, `permanent_401`, `malformed_json`, `no_evidences` ou `partial_response`. | Configura o provider Mock em memória do processo da API. Use `none` ao terminar; não injeta falhas em Gemini/OpenAI. |
| Consulta CNPJ avulsa | `cnpj`, `source?` | Informe 14 dígitos e escolha `brasilapi`, `cnpjws` ou `mock`. | Usa o mesmo serviço oficial de enriquecimento, cache, cooldown e rate limit. Não altera a empresa ativa. |

### Fluxo recomendado de diagnóstico

1. Atualize o status e observe a fila e a outbox antes de executar ações destrutivas.
2. Para um edital, use primeiro **Matching deste edital**, depois **Análise documental** e por fim **Regenerar Brief**.
3. Para testar resiliência, aplique uma falha do Mock, execute o smoke test, valide o tratamento e restaure `none`.
4. Para jobs falhos, inspecione a razão no worker, tente **Reprocessar falhos** e use **Limpar falhos** apenas para descartar o backlog conhecido.
5. Para CNPJ, use a consulta avulsa para validar fonte e normalização; use a limpeza de cache somente quando precisar forçar nova consulta.

### Segurança operacional

- O `procurementId` é validado contra a existência do edital.
- O `profileId` é validado contra a organização enviada pelo `TenantGuard`.
- Briefs, matches, alertas e consultas de status organizacionais respeitam o tenant ativo.
- A rota é ocultada no menu e a API responde `404` quando a flag está desativada.
- Não há controle de digest de e-mail nesta versão, pois o envio externo permanece fora do MVP.
