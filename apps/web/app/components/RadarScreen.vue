<script setup lang="ts">
import { states } from '@radar/contracts';
const { api } = useRadar();
const q = ref('');
const uf = ref('all');
const page = ref(1);
const onlyOpen = ref(false);
const { data, pending, error, refresh } = await useAsyncData('radar', () =>
  api<{ items: Procurement[]; total: number }>('procurements', {
    query: {
      q: q.value,
      uf: uf.value === 'all' ? undefined : uf.value,
      page: page.value,
      open: onlyOpen.value ? 'true' : undefined,
    },
  }),
);
async function search() {
  page.value = 1;
  await refresh();
}
async function paginate(change: number) {
  page.value += change;
  await refresh();
}
</script>
<template>
  <PageHeading
    title="Radar de oportunidades"
    description="Explore o catálogo coletado. Os filtros de UF representam a localização do órgão."
  />
  <form class="filter-bar" @submit.prevent="search">
    <UInput
      v-model="q"
      icon="i-lucide-search"
      placeholder="O que sua empresa fornece?"
      aria-label="Buscar licitações"
      class="flex-1 min-w-48"
      size="lg"
    /><USelect
      v-model="uf"
      :items="[
        { label: 'Todas as UFs', value: 'all' },
        ...states.map((s) => ({ label: s, value: s })),
      ]"
      aria-label="Filtrar por UF"
      size="lg"
    /><UCheckbox v-model="onlyOpen" label="Prazo aberto" /><UButton type="submit" size="lg"
      >Buscar</UButton
    >
  </form>
  <section class="panel">
    <div class="flex justify-between mb-2 text-xs text-slate-400">
      <span>{{ data?.total || 0 }} registros no catálogo</span
      ><span>Origem identificada · PNCP</span>
    </div>
    <AsyncState
      :pending="pending"
      :error="error"
      :empty="!data?.items.length"
      title="Nenhuma oportunidade por aqui, ainda."
      description="A coleta pode estar aguardando sua primeira execução. Você também pode ampliar os filtros de pesquisa."
      @retry="refresh"
      ><ProcurementCard v-for="item in data?.items" :key="item.id" :item="item"
    /></AsyncState>
    <div v-if="(data?.total || 0) > 12" class="flex items-center justify-end gap-4 mt-5">
      <UButton :disabled="page === 1" variant="outline" @click="paginate(-1)">Anterior</UButton
      ><span class="text-xs">Página {{ page }}</span
      ><UButton :disabled="page * 12 >= (data?.total || 0)" variant="outline" @click="paginate(1)"
        >Próxima</UButton
      >
    </div>
  </section>
</template>
