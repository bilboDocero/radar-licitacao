export default defineNuxtRouteMiddleware(async () => {
  try {
    await useRadar().api('partners/me');
  } catch {
    return abortNavigation(createError({ statusCode: 403, message: 'Parceiro não cadastrado' }));
  }
});
