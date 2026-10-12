import { config } from 'dotenv';
import { z } from 'zod';
import pino from 'pino';
import { fileURLToPath } from 'node:url';
config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));
const optionalUrl = z
  .string()
  .optional()
  .or(z.literal(''))
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  OIDC_ISSUER: z.string().url(),
  OIDC_JWKS_URL: z.string().url(),
  OIDC_AUDIENCE: z.string().default('radar-api'),
  COLLECTION_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  COLLECTION_INTERVAL_MS: z.coerce.number().min(60000).default(3600000),
  PNCP_LOOKBACK_DAYS: z.coerce.number().int().min(1).max(30).default(2),
  AI_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  AI_DEFAULT_PROVIDER: z.string().default('mock'),
  AI_DEFAULT_MODEL: z.string().default('mock-brief-v1'),
  AI_FALLBACK_PROVIDER: optionalString,
  AI_FALLBACK_MODEL: optionalString,
  AI_MAX_INPUT_TOKENS: z.coerce.number().int().positive().default(32000),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(4000),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),
  AI_MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),
  AI_DAILY_BUDGET_USD: z.coerce.number().positive().default(10),
  AI_MONTHLY_BUDGET_USD: z.coerce.number().positive().default(100),
  OPENAI_API_KEY: optionalString,
  GEMINI_API_KEY: optionalString,
  ANTHROPIC_API_KEY: optionalString,
  GROQ_API_KEY: optionalString,
  OPENROUTER_API_KEY: optionalString,
  OLLAMA_BASE_URL: optionalUrl,
});
export function environment() {
  return envSchema.parse(process.env);
}
export const logger = pino({
  redact: [
    'req.headers.authorization',
    'password',
    'token',
    'access_token',
    'refresh_token',
    'OPENAI_API_KEY',
    'GEMINI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GROQ_API_KEY',
    'OPENROUTER_API_KEY',
  ],
  base: { service: process.env.OTEL_SERVICE_NAME || 'radar' },
});
export async function startTelemetry(serviceName: string) {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return;
  const { NodeSDK } = await import('@opentelemetry/sdk-node');
  const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
  const sdk = new NodeSDK({ serviceName, instrumentations: [getNodeAutoInstrumentations()] });
  sdk.start();
  return sdk;
}
