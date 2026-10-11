export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;
  if (!/^\/(app|admin|parceiro|onboarding|convite)(\/|$)/.test(path)) return;
  try {
    await accessToken(event);
  } catch {
    return sendRedirect(event, '/entrar');
  }
  const session = await getUserSession(event);
  if (path.startsWith('/admin') && !session.user?.roles.includes('platform-admin'))
    throw createError({ statusCode: 403, message: 'Área restrita à administração' });
  if (path.startsWith('/parceiro')) {
    try {
      await $fetch(`${useRuntimeConfig().apiBase}/partners/me`, {
        headers: { authorization: `Bearer ${await accessToken(event)}` },
      });
    } catch {
      throw createError({ statusCode: 403, message: 'Você ainda não possui cadastro de parceiro' });
    }
  }
  setHeader(event, 'Cache-Control', 'private, no-store');
});
