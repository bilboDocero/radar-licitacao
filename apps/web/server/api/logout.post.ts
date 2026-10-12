export default defineEventHandler(async (event) => {
  if (getHeader(event, 'origin') !== useRuntimeConfig().webOrigin)
    throw createError({ statusCode: 403 });
  const session = await getUserSession(event);
  if (session.secure?.sid) await sessionStore().del(`session:${session.secure.sid}`);
  await clearUserSession(event);

  const runtime = useRuntimeConfig();
  const logoutUrl = `${runtime.oidcIssuer}/protocol/openid-connect/logout?post_logout_redirect_uri=${encodeURIComponent(runtime.webOrigin + '/entrar')}&client_id=${encodeURIComponent(runtime.oidcClientId)}`;

  return { success: true, logoutUrl };
});
