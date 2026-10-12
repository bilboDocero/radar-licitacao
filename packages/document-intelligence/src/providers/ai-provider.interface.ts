import type { z } from 'zod';
import type { AITaskType } from '@radar/contracts';

export interface AIPromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIPromptRequest {
  taskType: AITaskType;
  model: string;
  messages: AIPromptMessage[];
  jsonSchema?: Record<string, unknown>;
  schemaName?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface AIProviderResponse<T> {
  provider: string;
  model: string;
  data: T;
  rawText: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  costUsd: number;
}

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  generateStructured<T>(
    request: AIPromptRequest,
    schema: z.ZodType<T, any, any>,
  ): Promise<AIProviderResponse<T>>;
}
