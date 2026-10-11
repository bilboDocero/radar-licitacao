export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, fetch: refresh } = useUserSession();
  if (!loggedIn.value) await refresh();
  if (!loggedIn.value) return navigateTo('/entrar');
  const radar = useRadar();
  try {
    await radar.loadOrganizations();
  } catch {
    return navigateTo('/entrar');
  }
  if (to.path.startsWith('/app') && !radar.activeOrganization.value)
    return navigateTo('/onboarding');
});
