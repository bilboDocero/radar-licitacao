import type { z } from 'zod';
import type { AIProvider, AIPromptRequest, AIProviderResponse } from './ai-provider.interface.js';

interface OpenAICompletionResponse {
  id?: string;
  choices: Array<{
    message: {
      content: string | null;
      refusal?: string | null;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class OpenAIProvider implements AIProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI Official API';

  constructor(
    private readonly apiKey?: string,
    private readonly baseUrl = 'https://api.openai.com/v1',
  ) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 5);
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const isMini = model.includes('mini');
    const inputRatePerMillion = isMini ? 0.15 : 2.5;
    const outputRatePerMillion = isMini ? 0.6 : 10.0;
    return (
      (inputTokens / 1_000_000) * inputRatePerMillion +
      (outputTokens / 1_000_000) * outputRatePerMillion
    );
  }

  async generateStructured<T>(
    request: AIPromptRequest,
    schema: z.ZodType<T>,
  ): Promise<AIProviderResponse<T>> {
    if (!this.isConfigured()) {
      throw new Error('OPENAI_API_KEY não configurada no ambiente');
    }

    const start = Date.now();
    const payload: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.1,
      max_completion_tokens: request.maxTokens ?? 4096,
    };

    if (request.jsonSchema) {
      payload.response_format = {
        type: 'json_schema',
        json_schema: {
          name: request.schemaName || 'structured_output',
          strict: true,
          schema: request.jsonSchema,
        },
      };
    } else {
      payload.response_format = { type: 'json_object' };
    }

    let response: Response | undefined;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await pause(1000 * 2 ** attempt);
      }
      try {
        const timeoutSignal = AbortSignal.timeout(60000);
        const signal = request.signal
          ? AbortSignal.any([request.signal, timeoutSignal])
          : timeoutSignal;

        response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(payload),
          signal,
        });

        if (response.status === 429 || response.status >= 500) {
          const text = await response.text();
          lastError = new Error(`OpenAI respondeu status ${response.status}: ${text.slice(0, 300)}`);
          continue;
        }

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`OpenAI HTTP ${response.status}: ${text.slice(0, 300)}`);
        }

        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt === 2) throw lastError;
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error('Falha de comunicação com a OpenAI');
    }

    const result = (await response.json()) as OpenAICompletionResponse;
    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI retornou resposta vazia ou recusa.');
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(content);
    } catch {
      throw new Error(`OpenAI não retornou JSON válido: ${content.slice(0, 200)}`);
    }

    const validatedData = schema.parse(parsedJson);
    const inputTokens = result.usage?.prompt_tokens ?? 0;
    const outputTokens = result.usage?.completion_tokens ?? 0;
    const totalTokens = result.usage?.total_tokens ?? inputTokens + outputTokens;
    const latencyMs = Math.max(1, Date.now() - start);
    const costUsd = this.calculateCost(request.model, inputTokens, outputTokens);

    return {
      provider: this.id,
      model: request.model,
      data: validatedData,
      rawText: content,
      inputTokens,
      outputTokens,
      totalTokens,
      latencyMs,
      costUsd,
    };
  }
}
