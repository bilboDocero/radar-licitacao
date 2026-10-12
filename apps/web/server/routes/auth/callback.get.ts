import * as oidc from 'openid-client';
import { randomUUID } from 'node:crypto';
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const transaction = session.secure?.oauth;
  if (!transaction || transaction.expiresAt < Date.now())
    throw createError({ statusCode: 400, message: 'Autenticação expirada. Tente novamente.' });
  try {
    const runtime = useRuntimeConfig();
    const url = new URL(
      getRequestURL(event).pathname + getRequestURL(event).search,
      runtime.webOrigin,
    );
    const tokens = await oidc.authorizationCodeGrant(await oidcConfiguration(), url, {
      pkceCodeVerifier: transaction.verifier,
      expectedState: transaction.state,
      expectedNonce: transaction.nonce,
    });
    const user = await $fetch<{ id: string; email: string; roles: string[] }>(
      `${runtime.apiBase}/identity/me`,
      { headers: { authorization: `Bearer ${tokens.access_token}` } },
    );
    const sid = randomUUID();
    await sessionStore().set(
      `session:${sid}`,
      JSON.stringify({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        idToken: tokens.id_token,
        expiresAt: Date.now() + (tokens.expires_in || 300) * 1000,
      }),
      'EX',
      28800,
    );
    await clearUserSession(event);
    await setUserSession(event, {
      user: { ...user, name: String(tokens.claims()?.name || user.email) },
      secure: { sid },
    });
    return sendRedirect(event, '/app');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('OIDC callback failed:', msg);
    await clearUserSession(event);

    let erroCode = 'autenticacao';
    if (msg.includes('Verifique seu e-mail')) {
      erroCode = 'email_nao_verificado';
    } else if (msg.includes('fetch failed')) {
      erroCode = 'servico_indisponivel';
    }

    return sendRedirect(event, `/entrar?erro=${erroCode}`);
  }
});
