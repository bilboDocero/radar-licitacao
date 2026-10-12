# Diagnóstico e Resolução de Problemas de IA (Troubleshooting)

Este guia orienta o diagnóstico e a recuperação de falhas no módulo de inteligência artificial do Radar de Licitações Públicas.

---

## 1. Problemas Comuns e Soluções

### 1.1. Erro de Autenticação / Chave Inválida (HTTP 401 / 403)
- **Sintoma:** Log com mensagem `OpenAI HTTP 401` ou `Gemini HTTP 403`.
- **Causa:** Variável `OPENAI_API_KEY` ou `GEMINI_API_KEY` incorreta, expirada ou com espaços no `.env`.
- **Diagnóstico:** Execute `pnpm smoke:ai`.
- **Solução:** Gere uma nova chave no portal do provedor e atualize o arquivo `.env`. Em desenvolvimento, o sistema pode operar normalmente com `AI_DEFAULT_PROVIDER=mock`.

### 1.2. Limite de Taxa Excedido (HTTP 429 - Too Many Requests)
- **Sintoma:** O provedor recusa novas chamadas por exaustão de cota por minuto (RPM/TPM).
- **Tratamento Automático:** O sistema executa até 3 tentativas com backoff exponencial. Se a falha persistir, o `AIModelRouter` aciona o `AI_FALLBACK_PROVIDER` caso esteja configurado.
- **Solução:** Aumente o tier da conta no provedor ou configure um provedor secundário de contingência.

### 1.3. Orçamento Limite Atingido (Status `SKIPPED_BUDGET`)
- **Sintoma:** As análises permanecem pendentes e o log indica `Limite de orçamento de IA excedido`.
- **Causa:** O gasto registrado em `ai_usage_records` para o dia ou mês atingiu `AI_DAILY_BUDGET_USD` ou `AI_MONTHLY_BUDGET_USD`.
- **Solução:** Acesse `/admin/inteligencia-artificial` para auditar os gastos e, se aprovado, eleve os limites correspondentes no `.env`.

### 1.4. Resposta Não Conforme com o Schema (ZodError)
- **Sintoma:** O modelo gerou texto livre ou faltou algum campo obrigatório.
- **Tratamento:** O adapter descarta a resposta malformada e relata o erro.
- **Solução:** Provedores como OpenAI (`gpt-4o-mini`) com `json_schema strict: true` garantem 100% de conformidade com o schema. Se estiver utilizando modelos experimentais, ative o provedor padrão homologado.

---

## 2. Como Reanalisar um Edital

Quando um edital apresentar status `FAILED` ou estiver desatualizado após retificação:

### Pela Interface Web:
1. Abra a licitação em `/app/licitacoes/[id]`.
2. Clique no botão **"Reanalisar edital com IA"**.
3. A nova análise será gerada imediatamente e o Opportunity Brief será atualizado.

### Pela API Direta:
```bash
curl -X POST http://localhost:4000/api/v1/procurements/{id}/analyze \
  -H "Authorization: Bearer <token>" \
  -H "X-Organization-Id: <org-id>"
```
