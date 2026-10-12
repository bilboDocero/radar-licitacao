import type { z } from 'zod';
import type {
  AIProvider,
  AIPromptRequest,
  AIProviderResponse,
} from '../providers/ai-provider.interface.js';
import type { AITaskType } from '@radar/contracts';
import { environment, logger } from '@radar/config';
import type { AIUsageTracker } from '../services/usage-tracker.service.js';

export interface ModelCapability {
  id: string;
  providerId: string;
  maxContext: number;
  maxOutput: number;
  supportsStructuredJson: boolean;
  costPerMillionInputUsd: number;
  costPerMillionOutputUsd: number;
}

export const MODEL_CATALOG: Record<string, ModelCapability> = {
  'mock-brief-v1': {
    id: 'mock-brief-v1',
    providerId: 'mock',
    maxContext: 128000,
    maxOutput: 4096,
    supportsStructuredJson: true,
    costPerMillionInputUsd: 0,
    costPerMillionOutputUsd: 0,
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    providerId: 'openai',
    maxContext: 128000,
    maxOutput: 16384,
    supportsStructuredJson: true,
    costPerMillionInputUsd: 0.15,
    costPerMillionOutputUsd: 0.6,
  },
  'gpt-4o': {
    id: 'gpt-4o',
    providerId: 'openai',
    maxContext: 128000,
    maxOutput: 16384,
    supportsStructuredJson: true,
    costPerMillionInputUsd: 2.5,
    costPerMillionOutputUsd: 10.0,
  },
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    providerId: 'gemini',
    maxContext: 1048576,
    maxOutput: 8192,
    supportsStructuredJson: true,
    costPerMillionInputUsd: 0.1,
    costPerMillionOutputUsd: 0.4,
  },
  'gemini-1.5-flash': {
    id: 'gemini-1.5-flash',
    providerId: 'gemini',
    maxContext: 1048576,
    maxOutput: 8192,
    supportsStructuredJson: true,
    costPerMillionInputUsd: 0.075,
    costPerMillionOutputUsd: 0.3,
  },
};

export class AIModelRouter {
  private readonly providers = new Map<string, AIProvider>();

  constructor(
    providers: AIProvider[] = [],
    private readonly usageTracker?: AIUsageTracker,
  ) {
    for (const p of providers) {
      this.registerProvider(p);
    }
  }

  registerProvider(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(providerId: string): AIProvider | undefined {
    return this.providers.get(providerId);
  }

  getRegisteredProviders(): Array<{ id: string; name: string; configured: boolean }> {
    return Array.from(this.providers.values()).map((p) => ({
      id: p.id,
      name: p.name,
      configured: p.isConfigured(),
    }));
  }

  resolveModelAndProvider(taskType: AITaskType): { providerId: string; model: string } {
    const env = environment();

    // If an explicit default provider is set and configured, prefer it:
    const defaultProviderId = env.AI_DEFAULT_PROVIDER;
    const defaultModel = env.AI_DEFAULT_MODEL;

    const provider = this.providers.get(defaultProviderId);
    if (provider?.isConfigured()) {
      return { providerId: defaultProviderId, model: defaultModel };
    }

    // Default heuristics per task:
    if (taskType === 'document.requirements_extraction') {
      const gemini = this.providers.get('gemini');
      if (gemini?.isConfigured()) {
        return { providerId: 'gemini', model: 'gemini-2.0-flash' };
      }
      const openai = this.providers.get('openai');
      if (openai?.isConfigured()) {
        return { providerId: 'openai', model: 'gpt-4o-mini' };
      }
    }

    // Fallback to configured mock if available:
    if (this.providers.has('mock')) {
      return { providerId: 'mock', model: 'mock-brief-v1' };
    }

    // Fallback to first configured provider:
    for (const [id, p] of this.providers.entries()) {
      if (p.isConfigured()) {
        return { providerId: id, model: defaultModel };
      }
    }

    return { providerId: defaultProviderId, model: defaultModel };
  }

  async executeWithFallback<T>(
    taskType: AITaskType,
    request: Omit<AIPromptRequest, 'taskType' | 'model'>,
    schema: z.ZodType<T, any, any>,
    meta?: { procurementId?: string; version?: number },
  ): Promise<AIProviderResponse<T>> {
    const env = environment();

    if (this.usageTracker) {
      const budgetOk = await this.usageTracker.canExecute();
      if (!budgetOk) {
        throw new Error('Limite de orçamento de IA excedido para o período.');
      }
    }

    const primary = this.resolveModelAndProvider(taskType);
    const primaryProvider = this.providers.get(primary.providerId);

    if (!primaryProvider) {
      throw new Error(`Provedor de IA '${primary.providerId}' não está registrado.`);
    }

    try {
      const response = await primaryProvider.generateStructured<T>(
        { ...request, taskType, model: primary.model },
        schema,
      );

      if (this.usageTracker) {
        await this.usageTracker.recordUsage({
          provider: response.provider,
          model: response.model,
          taskType,
          procurementId: meta?.procurementId || null,
          procurementVersion: meta?.version ?? null,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          totalTokens: response.totalTokens,
          latencyMs: response.latencyMs,
          costUsd: response.costUsd.toFixed(6),
          status: 'success',
          errorMessage: null,
        });
      }

      return response;
    } catch (primaryErr) {
      logger.warn(
        { err: primaryErr, provider: primary.providerId, taskType },
        'Falha no provedor primário de IA; avaliando fallback',
      );

      // Check fallback provider
      const fallbackProviderId = env.AI_FALLBACK_PROVIDER;
      const fallbackModel = env.AI_FALLBACK_MODEL || 'gpt-4o-mini';

      if (fallbackProviderId && fallbackProviderId !== primary.providerId) {
        const fallbackProvider = this.providers.get(fallbackProviderId);
        if (fallbackProvider?.isConfigured()) {
          try {
            logger.info({ fallback: fallbackProviderId, taskType }, 'Acionando fallback de IA');
            const fallbackResponse = await fallbackProvider.generateStructured<T>(
              { ...request, taskType, model: fallbackModel },
              schema,
            );

            if (this.usageTracker) {
              await this.usageTracker.recordUsage({
                provider: fallbackResponse.provider,
                model: fallbackResponse.model,
                taskType,
                procurementId: meta?.procurementId || null,
                procurementVersion: meta?.version ?? null,
                inputTokens: fallbackResponse.inputTokens,
                outputTokens: fallbackResponse.outputTokens,
                totalTokens: fallbackResponse.totalTokens,
                latencyMs: fallbackResponse.latencyMs,
                costUsd: fallbackResponse.costUsd.toFixed(6),
                status: 'success',
                errorMessage: null,
              });
            }

            return fallbackResponse;
          } catch (fallbackErr) {
            logger.error({ err: fallbackErr }, 'Fallback de IA também falhou');
          }
        }
      }

      // Record error
      if (this.usageTracker) {
        await this.usageTracker.recordUsage({
          provider: primary.providerId,
          model: primary.model,
          taskType,
          procurementId: meta?.procurementId || null,
          procurementVersion: meta?.version ?? null,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          latencyMs: 0,
          costUsd: '0',
          status: 'error',
          errorMessage: primaryErr instanceof Error ? primaryErr.message : String(primaryErr),
        });
      }

      throw primaryErr;
    }
  }
}
