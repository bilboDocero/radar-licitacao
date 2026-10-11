<script setup lang="ts">
const props = defineProps<{ section: string }>();
const paths: Record<string, string> = {
  index: 'admin',
  empresas: 'admin/organizations',
  parceiros: 'admin/partners',
  fontes: 'sources',
  solicitacoes: 'admin/requests',
  coletores: 'admin/runs',
  licitacoes: 'admin/procurements',
  planos: 'admin/plans',
  auditoria: 'admin/audit',
};
const { api } = useRadar();
const { data, pending, error, refresh } = await useAsyncData(`admin-${props.section}`, () =>
  api<unknown>(paths[props.section]!),
);
const rows = computed(() =>
  Array.isArray(data.value)
    ? (data.value as Record<string, unknown>[])
    : props.section === 'fontes'
      ? (data.value as { sources?: Record<string, unknown>[] } | null)?.sources || []
      : [],
);
const columns = computed(() =>
  rows.value.length
    ? Object.keys(rows.value[0]!)
        .filter(
          (k) => !['entitlements', 'hash', 'tokenHash', 'ownerUserId', 'id', 'payload'].includes(k),
        )
        .slice(0, 5)
    : [],
);
const search = ref('');
const visible = computed(() =>
  rows.value.filter((row) =>
    JSON.stringify(row).toLowerCase().includes(search.value.toLowerCase()),
  ),
);
const partner = reactive({ name: '', ownerEmail: '', brandName: '' });
const busy = ref(false);
const message = ref('');
async function createPartner() {
  busy.value = true;
  message.value = '';
  try {
    await api('partners', { method: 'POST', body: partner });
    partner.name = '';
    partner.ownerEmail = '';
    partner.brandName = '';
    await refresh();
  } catch (e) {
    message.value = errorMessage(e);
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <PageHeading
    :title="section === 'index' ? 'Operação em perspectiva' : `Administração · ${section}`"
    description="Visibilidade operacional da plataforma. Acesso restrito aos administradores."
  /><AsyncState :pending="pending" :error="error" @retry="refresh"
    ><div v-if="section === 'index'" class="stats">
      <div v-for="(value, key) in data as Record<string, number>" :key="key" class="panel">
        <p class="stat-label">{{ key }}</p>
        <p class="stat-value">{{ value }}</p>
      </div>
    </div>
    <section v-else class="panel">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Filtrar registros"
        aria-label="Filtrar registros"
        class="mb-5"
      /><AsyncState
        :empty="!visible.length"
        title="Nenhum registro encontrado"
        description="Os registros aparecem conforme a plataforma é utilizada."
        ><div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th v-for="column in columns" :key="column" scope="col">{{ column }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in visible" :key="index">
                <td v-for="column in columns" :key="column">{{ row[column] ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div></AsyncState
      >
      <p class="hint mt-4">
        Exibindo até 100 registros recentes. Homologação de fontes e alterações de planos exigem
        operação técnica nesta entrega.
      </p>
    </section></AsyncState
  >
  <section v-if="section === 'parceiros'" class="panel mt-6">
    <h2 class="panel-title">Cadastrar parceiro</h2>
    <form class="form-grid" @submit.prevent="createPartner">
      <label>Nome<input v-model="partner.name" required minlength="3" /></label
      ><label
        >E-mail do responsável já cadastrado<input
          v-model="partner.ownerEmail"
          type="email"
          required /></label
      ><label>Nome de marca<input v-model="partner.brandName" maxlength="100" /></label
      ><UAlert v-if="message" color="error" :title="message" /><UButton
        type="submit"
        :loading="busy"
        >Cadastrar parceiro</UButton
      >
    </form>
  </section>
</template>
