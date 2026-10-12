<template>
  <div class="public-container">
    <header class="public-nav">
      <NuxtLink to="/" class="wordmark"
        >radar<span aria-hidden="true" class="text-primary-500 font-bold">.</span><small>MVP</small></NuxtLink
      >
      <nav class="nav-links" aria-label="Navegação pública">
        <NuxtLink to="/funcionalidades">Como funciona</NuxtLink>
        <NuxtLink to="/cobertura">Cobertura</NuxtLink>
        <NuxtLink to="/planos">Planos</NuxtLink>
        <NuxtLink to="/faq">Dúvidas</NuxtLink>
        <UColorModeButton />
        <UButton to="/entrar" color="primary" class="primary-link font-semibold"
          >Acessar plataforma <UIcon name="i-lucide-arrow-up-right"
        /></UButton>
      </nav>
    </header>
    <main><slot /></main>
    <footer class="public-footer">
      <span>Radar de Licitações · Encontre seu próximo contrato.</span>
      <nav class="flex gap-5">
        <NuxtLink to="/contato">Contato</NuxtLink>
        <NuxtLink to="/termos-de-uso">Termos de uso</NuxtLink>
        <NuxtLink to="/privacidade">Privacidade</NuxtLink>
      </nav>
      <span>Dados de fontes públicas. Decisões com contexto.</span>
    </footer>
  </div>
</template>
