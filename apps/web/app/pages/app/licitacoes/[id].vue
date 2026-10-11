<script setup lang="ts">
definePageMeta({ layout: 'application', middleware: 'auth' });
const { api } = useRadar();
const id = String(useRoute().params.id);
const toast = useToast();
const busy = ref(false);
const { data, pending, error, refresh } = await useAsyncData(`procurement-${id}`, () =>
  api<Procurement & { versions: { version: number; createdAt: string }[] }>(`procurements/${id}`),
);
useSeoMeta({ title: () => data.value?.title || 'Detalhes da licitação' });
async function save() {
  busy.value = true;
  try {
    await api(`favorites/${id}`, { method: 'PUT' });
    toast.add({ title: 'Licitação salva', color: 'success' });
  } catch (e) {
    toast.add({ title: errorMessage(e), color: 'error' });
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <NuxtLink to="/app/radar" class="text-xs text-slate-500 inline-flex gap-2 items-center mb-6"
    ><UIcon name="i-lucide-arrow-left" />Voltar ao Radar</NuxtLink
  ><AsyncState :pending="pending" :error="error" @retry="refresh"
    ><template v-if="data"
      ><PageHeading
        :title="data.title"
        :description="data.agency"
        :eyebrow="data.sourceId.toUpperCase()"
      />
      <div class="actions mb-7">
        <UButton icon="i-lucide-bookmark" :loading="busy" @click="save">Salvar oportunidade</UButton
        ><UButton
          :to="data.officialUrl"
          external
          target="_blank"
          rel="noopener noreferrer"
          color="neutral"
          variant="outline"
          trailing-icon="i-lucide-external-link"
          >Ver edital na fonte oficial</UButton
        >
      </div>
      <div class="stats">
        <div class="panel">
          <p class="stat-label">Valor estimado</p>
          <p class="text-2xl mt-3">{{ formatMoney(data.estimatedValue) }}</p>
        </div>
        <div class="panel">
          <p class="stat-label">Prazo de proposta</p>
          <p class="text-2xl mt-3">{{ formatDate(data.deadline) }}</p>
        </div>
        <div class="panel">
          <p class="stat-label">Localização do órgão</p>
          <p class="text-2xl mt-3">{{ data.agencyState }} · {{ data.agencyMunicipality }}</p>
        </div>
      </div>
      <UAlert
        color="info"
        variant="subtle"
        title="Local de execução não identificado"
        description="A localização do órgão é uma referência. Consulte o edital para confirmar entrega, execução e todas as condições de participação."
        class="mb-6"
      />
      <section class="panel">
        <h2 class="panel-title">Rastreabilidade</h2>
        <p class="hint">
          Publicação: {{ formatDate(data.publishedAt) }} · Versão atual: {{ data.version }} ·
          Situação na fonte: {{ data.status }}
        </p>
        <ol class="mt-4 text-sm space-y-3">
          <li v-for="version in data.versions" :key="version.version">
            Versão {{ version.version }} registrada em {{ formatDate(version.createdAt) }}
          </li>
        </ol>
      </section></template
    ></AsyncState
  >
</template>
