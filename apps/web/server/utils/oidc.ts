import * as oidc from 'openid-client';
import { Redis } from 'ioredis';
import type { H3Event } from 'h3';
let connection: Redis | undefined;
let configuration: Promise<oidc.Configuration> | undefined;
export function sessionStore() {
  return (connection ||= new Redis(useRuntimeConfig().redisUrl, { maxRetriesPerRequest: 2 }));
}
export function oidcConfiguration() {
  if (configuration) return configuration;
  const config = useRuntimeConfig();
  const issuer = new URL(config.oidcIssuer);
  const internal = config.oidcInternalOrigin;
  configuration = oidc
    .discovery(issuer, config.oidcClientId, config.oidcClientSecret, undefined, {
      ...(issuer.protocol === 'http:' ? { execute: [oidc.allowInsecureRequests] } : {}),
      ...(internal
        ? {
            [oidc.customFetch]: (url, options) =>
              fetch(String(url).replace(issuer.origin, internal), options as RequestInit),
          }
        : {}),
    })
    .catch((error) => {
      configuration = undefined;
      throw error;
    });
  return configuration;
}
interface Tokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}
const refreshing = new Map<string, Promise<Tokens>>();
export async function accessToken(event: H3Event) {
  const session = await requireUserSession(event);
  const sid = session.secure?.sid;
  if (!sid) throw createError({ statusCode: 401, message: 'Sessão expirada' });
  const stored = await sessionStore().get(`session:${sid}`);
  if (!stored) {
    await clearUserSession(event);
    throw createError({ statusCode: 401, message: 'Entre novamente' });
  }
  let tokens = JSON.parse(stored) as Tokens;
  if (tokens.expiresAt <= Date.now() + 30000) {
    if (!tokens.refreshToken) throw createError({ statusCode: 401, message: 'Entre novamente' });
    let promise = refreshing.get(sid);
    if (!promise) {
      const refreshToken = tokens.refreshToken;
      promise = (async () => {
        const response = await oidc.refreshTokenGrant(await oidcConfiguration(), refreshToken);
        const next = {
          accessToken: response.access_token,
          refreshToken: response.refresh_token || refreshToken,
          expiresAt: Date.now() + (response.expires_in || 300) * 1000,
        };
        await sessionStore().set(`session:${sid}`, JSON.stringify(next), 'EX', 28800);
        return next;
      })().finally(() => refreshing.delete(sid));
      refreshing.set(sid, promise);
    }
    try {
      tokens = await promise;
    } catch {
      await sessionStore().del(`session:${sid}`);
      await clearUserSession(event);
      throw createError({ statusCode: 401, message: 'Sessão expirada' });
    }
  }
  return tokens.accessToken;
}
