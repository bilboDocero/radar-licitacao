<script setup lang="ts">
const { api } = useRadar();
const { data, pending, error, refresh } = await useAsyncData('sources', () =>
  api<{
    sources: { id: string; name: string; coverageNote: string; cursor: string | null }[];
    runs: { status: string; records: number; startedAt: string }[];
  }>('sources'),
);
const name = ref('');
const url = ref('');
const reason = ref('');
const busy = ref(false);
const message = ref('');
const toast = useToast();
async function suggest() {
  busy.value = true;
  message.value = '';
  try {
    await api('sources/requests', {
      method: 'POST',
      body: { name: name.value, url: url.value, reason: reason.value },
    });
    name.value = '';
    url.value = '';
    reason.value = '';
    toast.add({
      title: 'Sugestão registrada',
      description: 'A fonte será avaliada antes de qualquer coleta.',
      color: 'success',
    });
  } catch (e) {
    message.value = errorMessage(e);
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <PageHeading
    title="Transparência em cada fonte"
    description="Conheça o escopo de coleta e sugira portais relevantes para sua empresa."
  />
  <div class="two-column">
    <section class="panel">
      <h2 class="panel-title">Catálogo de fontes</h2>
      <AsyncState :pending="pending" :error="error" :empty="!data?.sources.length" @retry="refresh"
        ><article v-for="source in data?.sources" :key="source.id">
          <UBadge variant="subtle" color="neutral">{{ source.id.toUpperCase() }}</UBadge>
          <h3 class="font-semibold mt-4 mb-3">{{ source.name }}</h3>
          <p class="hint">{{ source.coverageNote }}</p>
          <p class="text-xs text-slate-500 mt-4">
            Última sincronização:
            {{ source.cursor ? formatDate(source.cursor) : 'Aguardando primeira coleta' }}
          </p>
        </article>
        <h3 class="font-semibold text-sm mt-8 mb-4">Execuções recentes</h3>
        <div
          v-for="(run, index) in data?.runs"
          :key="index"
          class="text-xs py-3 border-t border-slate-100 flex justify-between"
        >
          <span>{{ formatDate(run.startedAt) }}</span
          ><span>{{ run.status }}</span
          ><span>{{ run.records }} registros</span>
        </div>
        <p v-if="!data?.runs.length" class="hint">Nenhuma execução registrada.</p></AsyncState
      >
    </section>
    <section class="panel">
      <h2 class="panel-title">Faltou algum portal?</h2>
      <form class="form-grid" @submit.prevent="suggest">
        <label
          >Nome do portal<input
            v-model="name"
            required
            minlength="3"
            maxlength="150"
            placeholder="Portal de compras do município" /></label
        ><label
          >Endereço oficial<input
            v-model="url"
            type="url"
            required
            placeholder="https://..." /></label
        ><label
          >Por que essa fonte é relevante?<textarea
            v-model="reason"
            required
            minlength="10"
            maxlength="1000"
            rows="3"
          />
        </label>
        <p class="hint">
          A sugestão passa por revisão. Registrar uma URL não ativa o monitoramento.
        </p>
        <UAlert v-if="message" color="error" :title="message" /><UButton
          type="submit"
          :loading="busy"
          icon="i-lucide-send"
          >Enviar sugestão</UButton
        >
      </form>
    </section>
  </div>
</template>
