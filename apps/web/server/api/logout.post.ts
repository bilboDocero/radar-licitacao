export default defineEventHandler(async (event) => {
  if (getHeader(event, 'origin') !== useRuntimeConfig().webOrigin)
    throw createError({ statusCode: 403 });
  const session = await getUserSession(event);
  if (session.secure?.sid) await sessionStore().del(`session:${session.secure.sid}`);
  await clearUserSession(event);
  return { success: true };
});
