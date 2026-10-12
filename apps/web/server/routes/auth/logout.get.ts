export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  if (session.secure?.sid) {
    await sessionStore().del(`session:${session.secure.sid}`);
  }
  await clearUserSession(event);

  const runtime = useRuntimeConfig();
  const logoutUrl = new URL(`${runtime.oidcIssuer}/protocol/openid-connect/logout`);
  logoutUrl.searchParams.set('post_logout_redirect_uri', `${runtime.webOrigin}/entrar`);
  logoutUrl.searchParams.set('client_id', runtime.oidcClientId);

  return sendRedirect(event, logoutUrl.toString());
});
