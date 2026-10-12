# ADR 0006 — Inteligência Documental e Arquitetura Multi-Provider de IA

## Contexto
O Radar de Licitações necessita processar editais públicos e termos de referência para extrair requisitos de habilitação, critérios técnicos e pontos de atenção, gerando um Opportunity Brief personalizado para o assinante. A solução não pode depender de um único provedor proprietário de IA, não pode onerar o orçamento descontroladamente e não deve atrasar a notificação inicial de descoberta gerada pelo matching determinístico.

## Decisão
1. **Módulo Especializado e Abstração Multi-Provider:**
   Implementação de uma camada desacoplada (`@radar/document-intelligence` e `DocumentIntelligenceModule` na API) orientada pela interface `AIProvider`.
   Adapters funcionais integrados:
   - `MockAIProvider`: provedor determinístico sem custos para ambiente de desenvolvimento local e CI.
   - `OpenAIProvider`: integração oficial com a API da OpenAI (modelos `gpt-4o-mini`, `gpt-4o`) com saída estruturada JSON Schema estrita.
   - `GeminiProvider`: integração oficial com a API Google Gemini (modelos `gemini-2.0-flash`, `gemini-1.5-flash`).
2. **Processamento Compartilhado e Caching por Versão:**
   A extração documental de cada versão do edital é executada e persistida uma única vez no banco (`procurement_ai_analyses`). Múltiplos assinantes interessados na mesma oportunidade compartilham o resultado da extração pública, reduzindo drasticamente custos e latência de inferência.
3. **Desacoplamento Assíncrono via Worker:**
   O matching determinístico e o alerta preliminar de descoberta são concluídos e gravados antes de qualquer chamada de LLM. A análise documental e a geração do Opportunity Brief ocorrem assincronamente pelo worker, sem bloquear requisições HTTP nem o fluxo de coleta.
4. **Governança Orçamentária e Auditoria:**
   Todas as requisições de IA têm seus tokens, latência e custo em USD registrados em `ai_usage_records`. O `AIModelRouter` valida tetos orçamentários diários e mensais antes de acionar provedores externos, interrompendo chamadas caso o limite seja excedido.
5. **Defesa contra Prompt Injection:**
   O conteúdo de editais é tratado estritamente como dado não confiável. Os prompts de sistema reforçam o isolamento de instruções e todas as saídas são validadas contra schemas Zod estritos em `@radar/contracts`.

## Consequências
- A troca de provedor ou modelo ocorre exclusivamente por variáveis de ambiente (`AI_DEFAULT_PROVIDER`, `AI_DEFAULT_MODEL`, `AI_FALLBACK_PROVIDER`), sem alterações no código de domínio.
- Provedores externos indisponíveis acionam fallback controlado ou deixam a análise pendente, sem afetar o catálogo nem a notificação preliminar.
- O assinante recebe orientação comercial contextualizada, acompanhada de evidências rastreáveis e aviso de isenção jurídica.
