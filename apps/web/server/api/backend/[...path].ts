const publicPaths = new Set(['plans', 'sources', 'geography', 'health']);
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const path = getRouterParam(event, 'path') || '';
  if (!/^[a-zA-Z0-9/-]+$/.test(path) || path.includes('..')) throw createError({ statusCode: 400 });
  if (!['GET', 'HEAD'].includes(event.method) && getHeader(event, 'origin') !== config.webOrigin)
    throw createError({ statusCode: 403, message: 'Origem inválida' });
  const headers: Record<string, string> = {};
  if (!(event.method === 'GET' && publicPaths.has(path)))
    headers.authorization = `Bearer ${await accessToken(event)}`;
  const organization = getHeader(event, 'x-organization-id');
  if (organization) headers['x-organization-id'] = organization;
  try {
    return await $fetch(`${config.apiBase}/${path}`, {
      method: event.method,
      query: getQuery(event),
      headers,
      ...(!['GET', 'HEAD'].includes(event.method) ? { body: await readBody(event) } : {}),
    });
  } catch (error) {
    const failure = error as {
      statusCode?: number;
      data?: { error?: { message?: string; issues?: unknown } };
    };
    throw createError({
      statusCode: failure.statusCode || 502,
      message: failure.data?.error?.message || 'Não foi possível acessar o serviço',
      data: failure.data?.error,
    });
  }
});
