<script setup lang="ts">
import { states } from '@radar/contracts';

interface CommercialProfileView {
  id: string;
  name: string;
  keywords: string[];
  categories: string[];
  coverage: {
    national: boolean;
    states: string[];
    municipalities: string[];
  };
}

const { api } = useRadar();
const q = ref('');
const uf = ref('scope');
const page = ref(1);
const onlyOpen = ref(false);

const { data: profiles } = await useAsyncData('radar-commercial-profiles', () =>
  api<CommercialProfileView[]>('profiles').catch(() => []),
);

const activeProfile = computed(() => profiles.value?.[0] || null);
const isNational = computed(() => activeProfile.value?.coverage.national ?? true);
const profileStates = computed(() => activeProfile.value?.coverage.states || []);

const ufOptions = computed(() => {
  if (!isNational.value && profileStates.value.length > 0) {
    return [
      {
        label: `Minha área (${profileStates.value.join(', ')})`,
        value: 'scope',
      },
      ...profileStates.value.map((s) => ({ label: `Estado ${s}`, value: s })),
      { label: 'Todas as UFs (ampliar)', value: 'all' },
    ];
  }
  return [
    { label: 'Todas as UFs', value: 'all' },
    ...states.map((s) => ({ label: s, value: s })),
  ];
});

// Inicializa o valor de UF com base no perfil comercial
onMounted(() => {
  if (isNational.value) {
    uf.value = 'all';
  } else {
    uf.value = 'scope';
  }
});

const { data, pending, error, refresh } = await useAsyncData(
  'radar-procurements',
  () =>
    api<{ items: Procurement[]; total: number }>('procurements', {
      query: {
        q: q.value,
        uf: uf.value,
        page: page.value,
        open: onlyOpen.value ? 'true' : undefined,
      },
    }),
  { watch: [page] },
);

async function search() {
  page.value = 1;
  await refresh();
}

async function setKeyword(kw: string) {
  q.value = kw;
  page.value = 1;
  await refresh();
}

async function paginate(change: number) {
  page.value += change;
}
</script>

<template>
  <PageHeading
    title="Radar de oportunidades"
    description="Explore o catálogo coletado. Filtros automáticos respeitam a área comercial do seu perfil."
  />

  <!-- Banner Informativo do Escopo Ativo -->
  <div
    v-if="activeProfile && !isNational && profileStates.length"
    class="mb-5 p-3.5 rounded-xl bg-primary-50/50 dark:bg-primary-950/20 border border-primary-200/80 dark:border-primary-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
  >
    <div class="flex items-center gap-2 text-primary-900 dark:text-primary-200">
      <UIcon name="i-lucide-map-pin" class="w-4 h-4 text-primary-500 shrink-0" />
      <span>
        Escopo comercial ativo: <strong>{{ activeProfile.name }}</strong> restrito a
        <strong>{{ profileStates.join(', ') }}</strong>.
      </span>
    </div>
    <UButton
      v-if="uf === 'scope'"
      size="xs"
      variant="ghost"
      color="primary"
      @click="
        uf = 'all';
        search();
      "
    >
      Ampliar para todas as UFs →
    </UButton>
  </div>

  <form class="filter-bar" @submit.prevent="search">
    <UInput
      v-model="q"
      icon="i-lucide-search"
      placeholder="O que sua empresa fornece?"
      aria-label="Buscar licitações"
      class="flex-1 min-w-48"
      size="lg"
    />
    <USelect
      v-model="uf"
      :items="ufOptions"
      aria-label="Filtrar por UF"
      size="lg"
      class="min-w-44"
      @update:model-value="search"
    />
    <UCheckbox v-model="onlyOpen" label="Prazo aberto" @update:model-value="search" />
    <UButton type="submit" size="lg" color="primary">Buscar</UButton>
  </form>

  <!-- Pílulas rápidas de palavras-chave do perfil -->
  <div
    v-if="activeProfile?.keywords?.length"
    class="flex items-center gap-2 flex-wrap mb-6 text-xs text-slate-500 dark:text-slate-400"
  >
    <span>Palavras do seu perfil:</span>
    <button
      v-for="kw in activeProfile.keywords"
      :key="kw"
      type="button"
      class="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-950/50 hover:text-primary-600 dark:hover:text-primary-400 border border-slate-200 dark:border-slate-700 transition-colors"
      @click="setKeyword(kw)"
    >
      {{ kw }}
    </button>
  </div>

  <section class="panel">
    <div class="flex justify-between mb-3 text-xs text-slate-400 dark:text-slate-500">
      <span>{{ data?.total || 0 }} registros no catálogo</span>
      <span>Origem identificada · PNCP Oficial</span>
    </div>

    <AsyncState
      :pending="pending"
      :error="error"
      :empty="!data?.items?.length"
      title="Nenhuma oportunidade encontrada."
      :description="
        uf !== 'all' && !isNational
          ? `Nenhuma oportunidade encontrada na sua área atual (${profileStates.join(', ')}). Experimente ampliar para todas as UFs ou ajustar as palavras de busca.`
          : 'Ajuste os termos de busca ou aguarde novas publicações dos portais oficiais.'
      "
      @retry="refresh"
    >
      <template #action>
        <UButton
          v-if="uf !== 'all'"
          variant="outline"
          color="primary"
          @click="
            uf = 'all';
            q = '';
            search();
          "
        >
          Explorar todas as regiões monitoradas
        </UButton>
        <UButton
          v-else
          to="/app/perfil-comercial"
          variant="outline"
          color="neutral"
        >
          Ajustar perfil comercial
        </UButton>
      </template>

      <ProcurementCard v-for="item in data?.items" :key="item.id" :item="item" />
    </AsyncState>

    <div v-if="(data?.total || 0) > 12" class="flex items-center justify-end gap-4 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
      <UButton :disabled="page === 1" variant="outline" color="neutral" size="sm" @click="paginate(-1)">
        Anterior
      </UButton>
      <span class="text-xs text-slate-500 dark:text-slate-400">Página {{ page }}</span>
      <UButton
        :disabled="page * 12 >= (data?.total || 0)"
        variant="outline"
        color="neutral"
        size="sm"
        @click="paginate(1)"
      >
        Próxima
      </UButton>
    </div>
  </section>
</template>
