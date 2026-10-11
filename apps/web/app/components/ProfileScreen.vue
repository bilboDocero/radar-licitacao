<script setup lang="ts">
import { states } from '@radar/contracts';
interface Profile {
  id: string;
  name: string;
  keywords: string[];
  coverage: { national: boolean; states: string[]; municipalities: string[] };
}
const { api } = useRadar();
const { data, pending, error, refresh } = await useAsyncData('profiles', () =>
  api<Profile[]>('profiles'),
);
const name = ref('');
const keywords = ref('');
const coverage = ref('national');
const uf = ref('SP');
const municipality = ref('');
const busy = ref(false);
const message = ref('');
const toast = useToast();
const { data: geo } = await useAsyncData('geography', () =>
  api<{ municipalities: { code: string; name: string; state: string }[] }>('geography'),
);
async function save() {
  busy.value = true;
  message.value = '';
  try {
    await api('profiles', {
      method: 'POST',
      body: {
        name: name.value,
        keywords: keywords.value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
        categories: [],
        coverage: {
          national: coverage.value === 'national',
          states: coverage.value === 'state' ? [uf.value] : [],
          municipalities: coverage.value === 'municipality' ? [municipality.value] : [],
        },
      },
    });
    name.value = '';
    keywords.value = '';
    await refresh();
    toast.add({
      title: 'Perfil cadastrado',
      description: 'As oportunidades serão processadas em segundo plano.',
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
    title="O que sua empresa fornece?"
    description="Configure interesses claros para receber correspondências que você consegue explicar."
  />
  <div class="two-column">
    <section class="panel">
      <h2 class="panel-title">Novo perfil comercial</h2>
      <form class="form-grid" @submit.prevent="save">
        <label
          >Nome do perfil<input
            v-model="name"
            required
            minlength="2"
            maxlength="100"
            placeholder="Ex.: Materiais de escritório" /></label
        ><label
          >Palavras-chave<textarea
            v-model="keywords"
            required
            rows="3"
            placeholder="papel, impressora, material de escritório"
          />
        </label>
        <p class="hint">Separe por vírgulas. Buscamos essas palavras no objeto da contratação.</p>
        <label
          >Área de atuação<select v-model="coverage">
            <option value="national">Nacional</option>
            <option value="state">Um estado</option>
            <option value="municipality">Um município</option>
          </select></label
        ><label v-if="coverage === 'state'"
          >Estado<select v-model="uf">
            <option v-for="state in states" :key="state">{{ state }}</option>
          </select></label
        ><label v-if="coverage === 'municipality'"
          >Município (referência IBGE inicial)<select v-model="municipality" required>
            <option value="" disabled>Selecione</option>
            <option v-for="city in geo?.municipalities" :key="city.code" :value="city.code">
              {{ city.name }} / {{ city.state }} · {{ city.code }}
            </option>
          </select></label
        ><UAlert v-if="message" color="error" :title="message" /><UButton
          type="submit"
          :loading="busy"
          icon="i-lucide-plus"
          >Criar perfil comercial</UButton
        >
      </form>
    </section>
    <section class="panel">
      <h2 class="panel-title">Seus perfis</h2>
      <AsyncState
        :pending="pending"
        :error="error"
        :empty="!data?.length"
        title="Seu primeiro perfil começa ao lado"
        description="Um perfil reúne palavras-chave e cobertura comercial. Os limites dependem do plano da empresa."
        @retry="refresh"
        ><article v-for="profile in data" :key="profile.id" class="py-5 border-b border-slate-100">
          <h3 class="font-semibold text-sm">{{ profile.name }}</h3>
          <div class="flex flex-wrap gap-2 my-3">
            <UBadge
              v-for="keyword in profile.keywords"
              :key="keyword"
              variant="subtle"
              color="neutral"
              >{{ keyword }}</UBadge
            >
          </div>
          <p class="hint">
            {{
              profile.coverage.national
                ? 'Área comercial nacional'
                : profile.coverage.states.join(', ') || profile.coverage.municipalities.join(', ')
            }}
          </p>
        </article></AsyncState
      >
      <p class="hint mt-5">
        O matching considera prazo e localização. Quando não há local de execução, a localização do
        órgão aparece como referência explícita.
      </p>
    </section>
  </div>
</template>
