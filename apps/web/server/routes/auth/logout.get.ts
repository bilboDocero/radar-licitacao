export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const runtime = useRuntimeConfig();
  const logoutUrl = new URL(`${runtime.oidcIssuer}/protocol/openid-connect/logout`);
  logoutUrl.searchParams.set('post_logout_redirect_uri', `${runtime.webOrigin}/entrar`);
  logoutUrl.searchParams.set('client_id', runtime.oidcClientId);

  if (session.secure?.sid) {
    const stored = await sessionStore().get(`session:${session.secure.sid}`);
    if (stored) {
      const tokens = JSON.parse(stored) as { idToken?: string };
      if (tokens.idToken) logoutUrl.searchParams.set('id_token_hint', tokens.idToken);
    }
    await sessionStore().del(`session:${session.secure.sid}`);
  }
  await clearUserSession(event);

  return sendRedirect(event, logoutUrl.toString());
});
