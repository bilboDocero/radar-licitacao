# Gestão de Custos e Orçamento de Inteligência Artificial

## 1. Princípio Fundamental: Processamento Compartilhado

A regra econômica central do Radar de Licitações é o **compartilhamento da análise documental**:
- Um edital público (versão única) é submetido à análise de LLM **uma única vez**.
- O resultado estruturado em `procurement_ai_analyses` é reutilizado para dezenas ou centenas de empresas assinantes interessadas naquele segmento.
- A personalização de cada Opportunity Brief consome apenas metadados pré-estruturados, evitando o reenvio de centenas de páginas aos modelos de IA.

---

## 2. Metodologia de Cálculo de Custo por Análise

### 2.1. Tabela de Preços de Referência (em USD por 1M tokens)

| Modelo | Provedor | Entrada / 1M tokens | Saída / 1M tokens | Custo Médio Estimado por Edital |
|---|---|---|---|---|
| `mock-brief-v1` | Mock | $0.00 | $0.00 | **$0.0000** |
| `gemini-2.0-flash` | Gemini | $0.10 | $0.40 | **~$0.0015** (0,8 centavos de real) |
| `gpt-4o-mini` | OpenAI | $0.15 | $0.60 | **~$0.0025** (1,4 centavos de real) |
| `gpt-4o` | OpenAI | $2.50 | $10.00 | **~$0.0380** (21 centavos de real) |

### 2.2. Estimativa de Volume por Edital Típico
- **Contexto de Entrada:** ~8.000 a 15.000 tokens (resumo do edital, termo de referência e exigências centrais).
- **Saída Estruturada:** ~1.200 a 2.500 tokens (JSON com lista de requisitos, evidências, riscos e prazos).
- **Custo Médio Unitário com `gemini-2.0-flash` ou `gpt-4o-mini`:**
  $$\text{Custo} = (12.000 \times 0.15 / 10^6) + (1.800 \times 0.60 / 10^6) = \$0.0018 + \$0.00108 \approx \$0.0029\text{ USD}$$
  Equivale a menos de **3 centavos de real por edital analisado**.

---

## 3. Tetos Orçamentários e Suspensão Automática

O `AIUsageTracker` monitora em tempo real a tabela `ai_usage_records` e interrompe novas chamadas quando os limites forem atingidos:

```env
AI_DAILY_BUDGET_USD=10.00      # Teto diário de US$ 10,00 (~3.000 a 4.000 editais analisados)
AI_MONTHLY_BUDGET_USD=100.00   # Teto mensal de US$ 100,00
```

Se o teto for excedido:
1. O status da análise é registrado como `SKIPPED_BUDGET`.
2. A coleta de licitações **continua operando normalmente**.
3. O matching determinístico continua associando oportunidades às empresas.
4. O alerta preliminar continua sendo entregue ao assinante com a indicação de que a análise documental aprofundada está pendente.

---

## 4. Monitoramento no Painel Administrativo

Administradores com o papel `platform-admin` podem acessar `/admin/inteligencia-artificial` no painel web para acompanhar:
- Total de chamadas com sucesso vs. falhas.
- Consumo acumulado de tokens.
- Gasto total em USD.
- Latência média por requisição.
- Tabela detalhada das últimas chamadas de inferência.
