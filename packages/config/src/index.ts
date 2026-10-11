import { config } from 'dotenv';
import { z } from 'zod';
import pino from 'pino';
import { fileURLToPath } from 'node:url';
config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
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
});
export function environment() {
  return envSchema.parse(process.env);
}
export const logger = pino({
  redact: ['req.headers.authorization', 'password', 'token', 'access_token', 'refresh_token'],
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
