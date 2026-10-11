<template>
  <div class="auth-wrap">
    <aside class="auth-story">
      <NuxtLink to="/" class="wordmark">radar.</NuxtLink>
      <div>
        <span class="eyebrow text-emerald-300">O próximo passo da sua empresa</span>
        <h2 class="mt-6">Oportunidades públicas.<br />Possibilidades para o seu negócio.</h2>
        <p class="mt-8 text-sm text-emerald-100/70 max-w-sm leading-7">
          Seu perfil comercial encontra um catálogo compartilhado de licitações, com a origem de
          cada informação sempre disponível.
        </p>
      </div>
      <span class="text-xs text-emerald-100/50"
        >Radar de Licitações · Ambiente de desenvolvimento</span
      >
    </aside>
    <main class="auth-main">
      <div class="auth-card"><slot /></div>
    </main>
  </div>
</template>
