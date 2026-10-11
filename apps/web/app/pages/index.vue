<script setup lang="ts">
useSeoMeta({
  title: 'Oportunidades públicas para sua empresa',
  description:
    'Transforme seu perfil comercial em uma busca mais relevante por licitações públicas. Conheça o Radar.',
});
</script>
<template>
  <section class="hero">
    <div>
      <span class="eyebrow flex items-center gap-2"
        ><span class="size-2 rounded-full bg-emerald-600"></span>Inteligência para encontrar
        oportunidades</span
      >
      <h1>O próximo contrato<br />da sua empresa<br />pode estar <em>aqui.</em></h1>
      <p>
        Encontre licitações que fazem sentido para o seu negócio. Menos tempo procurando. Mais
        clareza para decidir onde participar.
      </p>
      <div class="actions">
        <UButton to="/cadastro" size="xl" trailing-icon="i-lucide-arrow-right"
          >Começar minha avaliação</UButton
        ><UButton to="/funcionalidades" color="neutral" variant="ghost" size="xl"
          >Conhecer o Radar</UButton
        >
      </div>
      <div class="hero-footnote">
        14 dias de avaliação · Sem cartão · Dados com origem identificada
      </div>
    </div>
    <div class="radar-preview">
      <div class="preview-head">
        <span class="font-semibold">Seu negócio no centro.</span
        ><UBadge color="success" variant="subtle" size="sm">Como funciona</UBadge>
      </div>
      <div class="preview-orbit">
        <div class="orbit-label"><UIcon name="i-lucide-radar" class="size-10" /></div>
      </div>
      <div class="preview-row">
        <UIcon name="i-lucide-building-2" class="text-emerald-600" />Sua empresa e seus
        interesses<span>01 / PERFIL</span>
      </div>
      <div class="preview-row">
        <UIcon name="i-lucide-map-pinned" class="text-emerald-600" />As regiões onde você atua<span
          >02 / COBERTURA</span
        >
      </div>
      <div class="preview-row">
        <UIcon name="i-lucide-file-check-2" class="text-emerald-600" />Oportunidades com
        contexto<span>03 / MATCHING</span>
      </div>
      <p class="text-center text-[10px] text-slate-400 mt-5">
        Ilustração do fluxo. Nenhuma licitação fictícia.
      </p>
    </div>
  </section>
  <section class="public-section">
    <span class="eyebrow">DA BUSCA À DECISÃO</span>
    <h2 class="section-heading">Um radar ajustado ao seu negócio.</h2>
    <div class="feature-grid">
      <article>
        <UIcon name="i-lucide-sliders-horizontal" class="size-7 text-emerald-700" />
        <h3>Defina o que você fornece</h3>
        <p>
          Palavras-chave, categorias e área de atuação formam um perfil comercial que você entende e
          controla.
        </p>
      </article>
      <article>
        <UIcon name="i-lucide-scan-search" class="size-7 text-emerald-700" />
        <h3>Veja o que combina</h3>
        <p>
          O Radar cruza seu perfil com as oportunidades coletadas e explica o motivo de cada
          correspondência.
        </p>
      </article>
      <article>
        <UIcon name="i-lucide-bookmark-check" class="size-7 text-emerald-700" />
        <h3>Organize os próximos passos</h3>
        <p>
          Salve oportunidades, acompanhe avisos e confira sempre os detalhes na fonte oficial antes
          de participar.
        </p>
      </article>
    </div>
  </section>
  <section class="public-section flex flex-wrap justify-between gap-8 items-center">
    <div>
      <span class="eyebrow">TRANSPARÊNCIA NA ORIGEM</span>
      <h2 class="section-heading">Fontes públicas. Cobertura clara.</h2>
      <p class="text-sm text-slate-500 max-w-xl leading-7">
        Começamos pelo PNCP, com um escopo de coleta definido. A abrangência do seu plano representa
        sua área comercial, e não uma promessa de monitoramento de todos os portais.
      </p>
    </div>
    <UButton to="/cobertura" variant="outline" trailing-icon="i-lucide-arrow-up-right"
      >Conheça a cobertura</UButton
    >
  </section>
</template>
