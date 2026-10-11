import * as oidc from 'openid-client';
export default defineEventHandler(async (event) => {
  const config = await oidcConfiguration();
  const runtime = useRuntimeConfig();
  const verifier = oidc.randomPKCECodeVerifier();
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  await setUserSession(event, {
    secure: { oauth: { verifier, state, nonce, expiresAt: Date.now() + 600000 } },
  });
  const url = oidc.buildAuthorizationUrl(config, {
    redirect_uri: `${runtime.webOrigin}/auth/callback`,
    scope: 'openid email profile',
    code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
    code_challenge_method: 'S256',
    state,
    nonce,
    ...(getQuery(event).register === 'true' ? { prompt: 'create' } : {}),
  });
  return sendRedirect(event, url.href);
});
