export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  modules: ['@nuxt/ui', 'nuxt-auth-utils'],
  css: ['~/assets/main.css'],
  devtools: { enabled: false },
  vite: { optimizeDeps: { include: ['@radar/contracts > zod'] } },
  colorMode: { preference: 'light' },
  runtimeConfig: {
    apiBase: 'http://localhost:4000/api/v1',
    redisUrl: 'redis://localhost:6379',
    oidcIssuer: 'http://localhost:8080/realms/radar',
    oidcClientId: 'radar-web',
    oidcClientSecret: '',
    oidcInternalOrigin: '',
    webOrigin: 'http://localhost:3000',
    session: { maxAge: 28800, cookie: { sameSite: 'lax', httpOnly: true } },
    public: {
      debugMode:
        process.env.DEBUG_MODE === 'true' ||
        process.env.DEBUG_MODE === 'on' ||
        process.env.DEBUG === 'on' ||
        process.env.DEBUG === 'true',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      titleTemplate: '%s · Radar',
      meta: [
        {
          name: 'description',
          content: 'Encontre oportunidades de compras públicas compatíveis com a sua empresa.',
        },
      ],
    },
  },
  typescript: { strict: true },
});
