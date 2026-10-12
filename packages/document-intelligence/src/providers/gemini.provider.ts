import type { z } from 'zod';
import type { AIProvider, AIPromptRequest, AIProviderResponse } from './ai-provider.interface.js';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function cleanSchemaForGemini(schema: unknown): unknown {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map(cleanSchemaForGemini);

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (['additionalProperties', '$schema', 'default'].includes(key)) {
      continue;
    }
    cleaned[key] = cleanSchemaForGemini(value);
  }
  return cleaned;
}

export class GeminiProvider implements AIProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini API';

  constructor(
    private readonly apiKey?: string,
    private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta',
  ) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 5);
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const isFlashLite = model.includes('lite');
    const inputRate = isFlashLite ? 0.075 : 0.1;
    const outputRate = isFlashLite ? 0.3 : 0.4;
    return (inputTokens / 1_000_000) * inputRate + (outputTokens / 1_000_000) * outputRate;
  }

  async generateStructured<T>(
    request: AIPromptRequest,
    schema: z.ZodType<T>,
  ): Promise<AIProviderResponse<T>> {
    if (!this.isConfigured()) {
      throw new Error('GEMINI_API_KEY não configurada no ambiente');
    }

    const start = Date.now();
    const systemInstruction = request.messages.find((m) => m.role === 'system')?.content;
    const userMessages = request.messages.filter((m) => m.role !== 'system');

    const contents = userMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const generationConfig: Record<string, unknown> = {
      responseMimeType: 'application/json',
      temperature: request.temperature ?? 0.1,
      maxOutputTokens: request.maxTokens ?? 4096,
    };

    if (request.jsonSchema) {
      generationConfig.responseSchema = cleanSchemaForGemini(request.jsonSchema);
    }

    const body: Record<string, unknown> = {
      contents,
      generationConfig,
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const modelName = request.model.startsWith('models/')
      ? request.model
      : `models/${request.model}`;
    const url = `${this.baseUrl}/${modelName}:generateContent?key=${this.apiKey}`;

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

        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal,
        });

        if (response.status === 429 || response.status >= 500) {
          const text = await response.text();
          lastError = new Error(`Gemini respondeu status ${response.status}: ${text.slice(0, 300)}`);
          continue;
        }

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Gemini HTTP ${response.status}: ${text.slice(0, 300)}`);
        }

        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt === 2) throw lastError;
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error('Falha de comunicação com Google Gemini');
    }

    const result = (await response.json()) as GeminiResponse;
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('Gemini retornou conteúdo vazio.');
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      throw new Error(`Gemini não retornou JSON válido: ${rawText.slice(0, 200)}`);
    }

    const validatedData = schema.parse(parsedJson);
    const inputTokens = result.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = result.usageMetadata?.candidatesTokenCount ?? 0;
    const totalTokens = result.usageMetadata?.totalTokenCount ?? inputTokens + outputTokens;
    const latencyMs = Math.max(1, Date.now() - start);
    const costUsd = this.calculateCost(request.model, inputTokens, outputTokens);

    return {
      provider: this.id,
      model: request.model,
      data: validatedData,
      rawText,
      inputTokens,
      outputTokens,
      totalTokens,
      latencyMs,
      costUsd,
    };
  }
}
