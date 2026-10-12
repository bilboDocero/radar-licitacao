<template>
  <div class="auth-wrap">
    <aside class="auth-story">
      <div class="flex items-center justify-between">
        <NuxtLink to="/" class="wordmark">radar<span class="text-primary-500 font-bold">.</span></NuxtLink>
        <UColorModeButton />
      </div>
      <div>
        <span class="eyebrow text-primary-400">O próximo passo da sua empresa</span>
        <h2 class="mt-6 text-slate-100">Oportunidades públicas.<br />Possibilidades para o seu negócio.</h2>
        <p class="mt-8 text-sm text-slate-300 max-w-sm leading-7">
          Seu perfil comercial encontra um catálogo compartilhado de licitações, com a origem de
          cada informação sempre disponível.
        </p>
      </div>
      <span class="text-xs text-slate-400"
        >Radar de Licitações · Ambiente de desenvolvimento</span
      >
    </aside>
    <main class="auth-main">
      <div class="auth-card"><slot /></div>
    </main>
  </div>
</template>
