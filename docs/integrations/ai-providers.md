# Integração com Provedores de Inteligência Artificial

Este documento orienta como obter, configurar e gerenciar credenciais para os provedores de inteligência artificial suportados pela plataforma Radar de Licitações Públicas.

---

## 1. Visão Geral

A arquitetura de IA é **multi-provider e agnóstica**. O sistema suporta múltiplos provedores através da interface `AIProvider` e do roteador dinâmico `AIModelRouter`.

| Provedor | Adapter | Modelos Recomendados | Finalidade Principal |
|---|---|---|---|
| **Mock** | `MockAIProvider` | `mock-brief-v1` | Desenvolvimento local, testes unitários e CI sem custos. |
| **Google Gemini** | `GeminiProvider` | `gemini-3.5-flash-lite`, `gemini-2.5-flash` | Extração de requisitos com contexto longo, nível gratuito de tokens e excelente custo-benefício. *(Nota: gemini-2.0-flash foi descontinuado em 01/06/2026).* |
| **OpenAI** | `OpenAIProvider` | `gpt-4o-mini`, `gpt-4o` | Extração estruturada com modo JSON Schema estrito e alta fidelidade. |
| **Anthropic** | Preparado | `claude-3-5-haiku` | Análise crítica e revisão de riscos. |
| **Ollama** | Preparado | Modelos locais (Llama 3, Qwen) | Ambientes de desenvolvimento offline. |

---

## 2. Como Obter e Configurar as Credenciais

### 2.1. Mock Provider (Padrão de Desenvolvimento)
- **Custo:** Gratuito ($0.00).
- **Configuração:** Ativo por padrão no `.env.example`. Não requer chave de API externa nem conexão à internet.
- **Variáveis:**
  ```env
  AI_ENABLED=true
  AI_DEFAULT_PROVIDER=mock
  AI_DEFAULT_MODEL=mock-brief-v1
  ```

### 2.2. Google Gemini
1. Acesse o [Google AI Studio](https://aistudio.google.com/).
2. Faça login com uma conta Google.
3. Clique em **Get API Key** e selecione ou crie um projeto no Google Cloud.
4. Copie a chave gerada (iniciada por `AIza...`).
5. No arquivo `.env`, preencha:
   ```env
   AI_ENABLED=true
   AI_DEFAULT_PROVIDER=gemini
   AI_DEFAULT_MODEL=gemini-3.5-flash-lite
   GEMINI_API_KEY=AIzaSy...
   ```
*Nota sobre modelos e cotas:* O modelo `gemini-2.0-flash` foi descontinuado em 01/06/2026. Recomendamos o modelo vigente `gemini-3.5-flash-lite`, que possui nível gratuito amplo para entrada e saída de tokens no Google AI Studio (até 15 RPM e 1.500 RPD), ideal para desenvolvimento e homologação.

### 2.3. OpenAI
1. Acesse a [Plataforma OpenAI](https://platform.openai.com/).
2. Crie ou acesse sua conta e vá até a seção **API Keys**.
3. Clique em **Create new secret key**, dê um identificador (ex.: `radar-licitacoes-dev`) e copie o token gerado (iniciado por `sk-...`).
4. Configure créditos de API no painel de faturamento (Billing). O plano ChatGPT Plus não inclui créditos de API da OpenAI.
5. No arquivo `.env`, preencha:
   ```env
   AI_ENABLED=true
   AI_DEFAULT_PROVIDER=openai
   AI_DEFAULT_MODEL=gpt-4o-mini
   OPENAI_API_KEY=sk-proj-...
   ```

---

## 3. Configuração de Fallback e Limites Orçamentários

Para garantir resiliência e controle de gastos, configure o provedor secundário e os tetos no `.env`:

```env
# Provedor de contingência
AI_FALLBACK_PROVIDER=openai
AI_FALLBACK_MODEL=gpt-4o-mini

# Limites de contexto e inferência
AI_MAX_INPUT_TOKENS=32000
AI_MAX_OUTPUT_TOKENS=4000
AI_REQUEST_TIMEOUT_MS=60000
AI_MAX_RETRIES=3

# Tetos de gastos automáticos
AI_DAILY_BUDGET_USD=10.00
AI_MONTHLY_BUDGET_USD=100.00
```

Se o provedor primário sofrer indisponibilidade temporária (ex.: 429 ou 503), o `AIModelRouter` aciona automaticamente o fallback configurado. Se o teto diário ou mensal for atingido, novas chamadas externas são suspensas para proteger o orçamento do SaaS.

---

## 4. Teste de Fumaça (Smoke Test)

Para verificar se as chaves e a conectividade estão funcionando sem expor credenciais, execute:

```bash
pnpm smoke:ai
```

O comando executará uma tarefa de teste, validará o schema Zod e exibirá o provedor, modelo, latência, quantidade de tokens e custo estimado em USD.
