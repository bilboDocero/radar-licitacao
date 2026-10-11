export default defineNuxtRouteMiddleware(() => {
  if (!useUserSession().user.value?.roles.includes('platform-admin'))
    return abortNavigation(
      createError({ statusCode: 403, message: 'Acesso administrativo necessário' }),
    );
});
