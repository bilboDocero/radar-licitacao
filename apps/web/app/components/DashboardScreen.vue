<script setup lang="ts">
const radar = useRadar();
const { data, pending, error, refresh } = await useAsyncData('dashboard', async () => {
  const [matches, favorites, profiles] = await Promise.all([
    radar.api<{ match: { reasons: string[] }; procurement: Procurement }[]>('matches'),
    radar.api<unknown[]>('favorites'),
    radar.api<unknown[]>('profiles'),
  ]);
  return { matches, favorites, profiles };
});
</script>
<template>
  <PageHeading
    title="Seu radar, em perspectiva."
    description="Um lugar para acompanhar o que faz sentido para a sua empresa."
    eyebrow="VISÃO GERAL"
    ><UButton
      to="/app/radar"
      trailing-icon="i-lucide-arrow-up-right"
      variant="outline"
      color="neutral"
      class="hidden sm:inline-flex"
      >Explorar licitações</UButton
    ></PageHeading
  ><AsyncState :pending="pending" :error="error" @retry="refresh"
    ><div class="stats">
      <div class="panel stat">
        <div>
          <p class="stat-label">Oportunidades compatíveis</p>
          <p class="stat-value">{{ data?.matches.length || 0 }}</p>
          <p class="stat-note">Propostas com prazo aberto</p>
        </div>
        <UIcon name="i-lucide-radar" class="text-primary-500 size-5" />
      </div>
      <div class="panel stat">
        <div>
          <p class="stat-label">Oportunidades salvas</p>
          <p class="stat-value">{{ data?.favorites.length || 0 }}</p>
          <p class="stat-note">Na lista da sua empresa</p>
        </div>
        <UIcon name="i-lucide-bookmark" class="text-primary-500 size-5" />
      </div>
      <div class="panel stat">
        <div>
          <p class="stat-label">Perfis comerciais</p>
          <p class="stat-value">{{ data?.profiles.length || 0 }}</p>
          <p class="stat-note">Interesses que orientam seu Radar</p>
        </div>
        <UIcon name="i-lucide-sliders-horizontal" class="text-primary-500 size-5" />
      </div>
    </div>
    <div class="dashboard-grid">
      <section class="panel">
        <div class="flex justify-between items-center">
          <h2 class="panel-title">No seu radar</h2>
          <UBadge variant="subtle" color="neutral">Matching explicável</UBadge>
        </div>
        <AsyncState
          :empty="!data?.matches.length"
          title="Vamos ajustar seu radar?"
          description="Cadastre seu perfil comercial. As correspondências aparecerão após o processamento das oportunidades coletadas."
          ><template #action
            ><UButton
              to="/app/perfil-comercial"
              color="primary"
              trailing-icon="i-lucide-arrow-right"
              >Configurar meu perfil</UButton
            ></template
          ><ProcurementCard
            v-for="row in data?.matches.slice(0, 5)"
            :key="row.procurement.id"
            :item="row.procurement"
            :reasons="row.match.reasons"
        /></AsyncState>
      </section>
      <aside class="space-y-5">
        <div class="panel">
          <UIcon name="i-lucide-route" class="size-6 text-primary-500 mb-4" />
          <h2 class="panel-title">Seu caminho até a oportunidade</h2>
          <ol class="space-y-6 text-xs text-slate-500 dark:text-slate-400">
            <li class="flex gap-3">
              <span class="text-primary-600 dark:text-primary-400 font-bold text-sm">01</span>
              <div>
                <strong class="text-slate-900 dark:text-slate-100">Sua empresa</strong>
                <p class="mt-1">{{ radar.organization.value?.name }}</p>
              </div>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 dark:text-primary-400 font-bold text-sm">02</span>
              <div>
                <NuxtLink to="/app/perfil-comercial" class="font-semibold text-slate-900 dark:text-slate-100 hover:text-primary-500"
                  >Seu perfil comercial →</NuxtLink
                >
                <p class="mt-1">Produtos, serviços e palavras-chave</p>
              </div>
            </li>
            <li class="flex gap-3">
              <span class="text-primary-600 dark:text-primary-400 font-bold text-sm">03</span>
              <div>
                <NuxtLink to="/app/cobertura" class="font-semibold text-slate-900 dark:text-slate-100 hover:text-primary-500"
                  >Sua área de atuação →</NuxtLink
                >
                <p class="mt-1">Municípios, estados ou todo o país</p>
              </div>
            </li>
          </ol>
        </div>
        <div class="p-5 bg-primary-50/50 dark:bg-primary-950/20 rounded-xl border border-primary-200 dark:border-primary-900/40">
          <p class="text-xs font-semibold text-primary-900 dark:text-primary-300 flex items-center gap-2">
            <UIcon name="i-lucide-info" />Informação com contexto
          </p>
          <p class="text-xs leading-6 text-primary-800/80 dark:text-primary-300/70 mt-2">
            O endereço do órgão pode ser diferente do local de entrega. Confira sempre as condições
            no edital oficial.
          </p>
        </div>
      </aside>
    </div></AsyncState
  >
</template>
