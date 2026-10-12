<script setup lang="ts">
import type { OpportunityBrief, ProcurementAIAnalysis } from '@radar/contracts';

definePageMeta({ layout: 'application', middleware: 'auth' });
const { api } = useRadar();
const id = String(useRoute().params.id);
const toast = useToast();
const busy = ref(false);
const analyzing = ref(false);

const { data, pending, error, refresh } = await useAsyncData(`procurement-${id}`, () =>
  api<Procurement & { versions: { version: number; createdAt: string }[] }>(`procurements/${id}`),
);

const {
  data: brief,
  pending: briefPending,
  refresh: refreshBrief,
} = await useAsyncData(`procurement-brief-${id}`, () =>
  api<OpportunityBrief | null>(`procurements/${id}/brief`).catch(() => null),
);

useSeoMeta({ title: () => data.value?.title || 'Detalhes da licitação' });

async function save() {
  busy.value = true;
  try {
    await api(`favorites/${id}`, { method: 'PUT' });
    toast.add({ title: 'Licitação salva com sucesso', color: 'success' });
  } catch (e) {
    toast.add({ title: errorMessage(e), color: 'error' });
  } finally {
    busy.value = false;
  }
}

async function triggerReanalysis() {
  analyzing.value = true;
  try {
    await api(`procurements/${id}/analyze`, { method: 'POST' });
    await Promise.all([refresh(), refreshBrief()]);
    toast.add({ title: 'Análise documental por IA atualizada', color: 'success' });
  } catch (e) {
    toast.add({ title: errorMessage(e), color: 'error' });
  } finally {
    analyzing.value = false;
  }
}
</script>

<template>
  <NuxtLink to="/app/radar" class="text-xs text-slate-500 dark:text-slate-400 hover:text-primary-500 inline-flex gap-2 items-center mb-6">
    <UIcon name="i-lucide-arrow-left" />Voltar ao Radar
  </NuxtLink>

  <AsyncState :pending="pending" :error="error" @retry="refresh">
    <template v-if="data">
      <PageHeading
        :title="data.title"
        :description="data.agency"
        :eyebrow="data.sourceId.toUpperCase()"
      />

      <div class="actions mb-7 flex flex-wrap gap-3">
        <UButton icon="i-lucide-bookmark" color="primary" :loading="busy" @click="save">
          Salvar oportunidade
        </UButton>
        <UButton
          :to="data.officialUrl"
          external
          target="_blank"
          rel="noopener noreferrer"
          color="neutral"
          variant="outline"
          trailing-icon="i-lucide-external-link"
        >
          Ver edital na fonte oficial
        </UButton>
        <UButton
          icon="i-lucide-sparkles"
          color="primary"
          variant="subtle"
          :loading="analyzing"
          @click="triggerReanalysis"
        >
          Reanalisar edital com IA
        </UButton>
      </div>

      <div class="stats mb-6">
        <div class="panel">
          <p class="stat-label">Valor estimado</p>
          <p class="text-2xl mt-3 font-semibold text-primary-700 dark:text-primary-400">{{ formatMoney(data.estimatedValue) }}</p>
        </div>
        <div class="panel">
          <p class="stat-label">Prazo de proposta</p>
          <p class="text-2xl mt-3 font-semibold text-slate-900 dark:text-slate-100">{{ formatDate(data.deadline) }}</p>
        </div>
        <div class="panel">
          <p class="stat-label">Localização do órgão</p>
          <p class="text-2xl mt-3 font-semibold text-slate-900 dark:text-slate-100">{{ data.agencyState }} · {{ data.agencyMunicipality }}</p>
        </div>
      </div>

      <!-- Opportunity Brief da Inteligência Artificial -->
      <section class="panel mb-6 border border-primary-500/30 bg-white dark:bg-slate-900/40">
        <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400">
              <UIcon name="i-lucide-sparkles" class="w-6 h-6" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">Opportunity Brief — Análise por Inteligência Artificial</h2>
              <p class="text-xs text-slate-600 dark:text-slate-400">Requisitos fáticos extraídos, aderência comercial e cuidados jurídicos.</p>
            </div>
          </div>
          <UBadge
            v-if="brief"
            :color="brief.commercialFit.level === 'high' ? 'success' : brief.commercialFit.level === 'medium' ? 'warning' : 'neutral'"
            variant="subtle"
            size="md"
          >
            Aderência: {{ brief.commercialFit.score }}% ({{ brief.commercialFit.level.toUpperCase() }})
          </UBadge>
        </div>

        <div v-if="briefPending" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <UIcon name="i-lucide-loader-2" class="animate-spin w-5 h-5 mx-auto mb-2 text-primary-500" />
          Processando inteligência documental...
        </div>

        <div v-else-if="brief" class="space-y-6 text-sm">
          <!-- Resumo -->
          <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">Resumo Comercial</h3>
            <p class="text-slate-800 dark:text-slate-200 leading-relaxed">{{ brief.summary }}</p>
            <p class="text-xs text-slate-600 dark:text-slate-400 mt-2">
              <span class="font-medium text-slate-900 dark:text-slate-200">Geografia:</span>
              {{ brief.commercialFit.geographicFit.explanation }}
            </p>
          </div>

          <!-- Requisitos Principais Extraídos -->
          <div v-if="brief.keyRequirements.length">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">Requisitos Extraídos do Edital</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                v-for="req in brief.keyRequirements"
                :key="req.id"
                class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="font-semibold text-slate-900 dark:text-slate-100 text-xs">{{ req.title }}</span>
                  <UBadge size="xs" variant="outline" color="neutral">{{ req.category }}</UBadge>
                </div>
                <p class="text-xs text-slate-700 dark:text-slate-300 mt-1">{{ req.description }}</p>
                <p v-if="req.textExcerpt" class="text-[11px] text-slate-600 dark:text-slate-400 italic mt-2 border-l-2 border-primary-500 pl-2">
                  "{{ req.textExcerpt }}"
                  <span v-if="req.page" class="not-italic text-slate-500 dark:text-slate-400">(Pág. {{ req.page }})</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Riscos e Cuidados -->
          <div v-if="brief.risksAndCautions.length">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-3">Cuidados e Pontos de Atenção</h3>
            <ul class="space-y-2">
              <li
                v-for="(risk, idx) in brief.risksAndCautions"
                :key="idx"
                class="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-900 dark:text-amber-200 text-xs"
              >
                <UIcon name="i-lucide-alert-triangle" class="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <span>{{ risk.description }}</span>
              </li>
            </ul>
          </div>

          <!-- Próximos Passos -->
          <div v-if="brief.suggestedNextSteps.length">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">Próximos Passos Sugeridos</h3>
            <ol class="list-decimal list-inside space-y-1 text-xs text-slate-700 dark:text-slate-300">
              <li v-for="(step, sidx) in brief.suggestedNextSteps" :key="sidx">{{ step }}</li>
            </ol>
          </div>

          <!-- Disclaimer Legal Obrigatório -->
          <p class="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-3">
            {{ brief.disclaimer }}
          </p>
        </div>

        <div v-else class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <p class="mb-3">Ainda não há análise documental gerada para este edital.</p>
          <UButton size="sm" color="primary" :loading="analyzing" @click="triggerReanalysis">
            Executar análise com IA agora
          </UButton>
        </div>
      </section>

      <section class="panel">
        <h2 class="panel-title text-slate-900 dark:text-slate-100">Rastreabilidade e Versões</h2>
        <p class="hint text-slate-600 dark:text-slate-400">
          Publicação: {{ formatDate(data.publishedAt) }} · Versão atual: {{ data.version }} ·
          Situação na fonte: {{ data.status }}
        </p>
        <ol class="mt-4 text-sm space-y-3 text-slate-700 dark:text-slate-300">
          <li v-for="version in data.versions" :key="version.version">
            Versão {{ version.version }} registrada em {{ formatDate(version.createdAt) }}
          </li>
        </ol>
      </section>
    </template>
  </AsyncState>
</template>
