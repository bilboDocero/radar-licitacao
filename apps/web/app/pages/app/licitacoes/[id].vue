<script setup lang="ts">
import type { OpportunityBrief, ProcurementAIAnalysis } from '@radar/contracts';

definePageMeta({ layout: 'application', middleware: 'auth' });
const { api } = useRadar();
const id = String(useRoute().params.id);
const toast = useToast();
const busy = ref(false);

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
</script>

<template>
  <NuxtLink
    to="/app/radar"
    class="text-xs text-slate-500 dark:text-slate-400 hover:text-primary-500 inline-flex gap-2 items-center mb-6"
  >
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
          Ver no portal oficial do PNCP
        </UButton>
      </div>

      <div class="stats mb-6">
        <div class="panel">
          <p class="stat-label">Valor estimado</p>
          <p class="text-2xl mt-3 font-semibold text-primary-700 dark:text-primary-400">
            {{ formatMoney(data.estimatedValue) }}
          </p>
        </div>
        <div class="panel">
          <p class="stat-label">Prazo de proposta</p>
          <p class="text-2xl mt-3 font-semibold text-slate-900 dark:text-slate-100">
            {{ formatDate(data.deadline) }}
          </p>
        </div>
        <div class="panel">
          <p class="stat-label">Localização do órgão</p>
          <p class="text-2xl mt-3 font-semibold text-slate-900 dark:text-slate-100">
            {{ data.agencyState }} · {{ data.agencyMunicipality }}
          </p>
        </div>
      </div>

      <!-- Opportunity Brief da Inteligência Artificial -->
      <section class="panel mb-6 border border-primary-500/30 bg-white dark:bg-slate-900/40">
        <div
          class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4"
        >
          <div class="flex items-center gap-3">
            <div
              class="p-2 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400"
            >
              <UIcon name="i-lucide-sparkles" class="w-6 h-6" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">
                Opportunity Brief — Resumo de Decisão com Evidências
              </h2>
              <p class="text-xs text-slate-600 dark:text-slate-400">
                Análise documental automatizada por IA, extraída dos anexos oficiais e auditada com evidências rastreáveis.
              </p>
            </div>
          </div>
          <UBadge
            v-if="brief"
            :color="
              brief.commercialFit.level === 'high'
                ? 'success'
                : brief.commercialFit.level === 'medium'
                  ? 'warning'
                  : 'neutral'
            "
            variant="subtle"
            size="md"
          >
            Aderência: {{ brief.commercialFit.score }}% ({{
              brief.commercialFit.level.toUpperCase()
            }})
          </UBadge>
        </div>

        <div
          v-if="briefPending"
          class="py-8 text-center text-sm text-slate-500 dark:text-slate-400"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="animate-spin w-6 h-6 mx-auto mb-3 text-primary-500"
          />
          Inventariando documentos e processando inteligência documental...
        </div>

        <div v-else-if="brief" class="space-y-6 text-sm">
          <!-- Cobertura Documental -->
          <div
            v-if="brief.documentCoverage"
            class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50"
          >
            <div class="flex items-center justify-between mb-2">
              <span
                class="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2"
              >
                <UIcon name="i-lucide-file-text" class="w-4 h-4 text-primary-500" />
                Cobertura Documental da Análise
              </span>
              <UBadge
                :color="brief.documentCoverage.status === 'INTEGRAL' ? 'success' : 'warning'"
                size="xs"
                variant="subtle"
              >
                {{ brief.documentCoverage.status === 'INTEGRAL' ? 'Cobertura Integral' : 'Cobertura Parcial' }}
              </UBadge>
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-400">
              {{ brief.documentCoverage.totalRead }} documento(s) lido(s) ({{ brief.documentCoverage.totalPagesRead }} páginas) de {{ brief.documentCoverage.totalDiscovered }} identificado(s) no portal oficial.
            </p>
            <div v-if="brief.documentCoverage.documents?.length" class="mt-3 flex flex-wrap gap-2">
              <div
                v-for="(doc, dIdx) in brief.documentCoverage.documents"
                :key="dIdx"
                class="text-xs px-2.5 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-1.5"
              >
                <UIcon
                  :name="doc.status === 'read' ? 'i-lucide-check-circle-2' : 'i-lucide-alert-circle'"
                  :class="doc.status === 'read' ? 'text-emerald-500' : 'text-amber-500'"
                  class="w-3.5 h-3.5"
                />
                <span class="font-medium text-slate-800 dark:text-slate-200">{{ doc.name }}</span>
                <span class="text-[10px] text-slate-400">({{ doc.pageCount }} pág.)</span>
              </div>
            </div>
            <p v-if="brief.documentCoverage.pendingReason" class="text-[11px] text-amber-700 dark:text-amber-400 mt-2 italic">
              * {{ brief.documentCoverage.pendingReason }}
            </p>
          </div>

          <!-- Resumo Comercial -->
          <div
            class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50"
          >
            <h3
              class="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2"
            >
              Resumo Comercial para a Empresa
            </h3>
            <p class="text-slate-800 dark:text-slate-200 leading-relaxed">{{ brief.summary }}</p>
            <p class="text-xs text-slate-600 dark:text-slate-400 mt-2">
              <span class="font-medium text-slate-900 dark:text-slate-200">Compatibilidade Geográfica:</span>
              {{ brief.commercialFit.geographicFit.explanation }}
            </p>
          </div>

          <!-- 5 Blocos de Decisão com Evidências -->
          <div v-if="brief.decisionBlocks" class="space-y-3">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Resumo de Decisão Estratégica (5 Blocos)
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
                <div class="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1.5">
                  <UIcon name="i-lucide-package" class="w-4 h-4 text-primary-500" />
                  1. O que está sendo contratado
                </div>
                <p class="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {{ brief.decisionBlocks.objetoEscopo || 'Não localizado nos documentos analisados.' }}
                </p>
              </div>

              <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
                <div class="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1.5">
                  <UIcon name="i-lucide-calendar-clock" class="w-4 h-4 text-primary-500" />
                  2. Prazos importantes
                </div>
                <p class="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {{ brief.decisionBlocks.prazosImportantes || 'Não localizado nos documentos analisados.' }}
                </p>
              </div>

              <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
                <div class="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1.5">
                  <UIcon name="i-lucide-shield-check" class="w-4 h-4 text-primary-500" />
                  3. Exigências para participar
                </div>
                <p class="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {{ brief.decisionBlocks.exigenciasParticipacao || 'Não localizado nos documentos analisados.' }}
                </p>
              </div>

              <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
                <div class="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1.5">
                  <UIcon name="i-lucide-truck" class="w-4 h-4 text-primary-500" />
                  4. Condições operacionais
                </div>
                <p class="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {{ brief.decisionBlocks.condicoesOperacionais || 'Não localizado nos documentos analisados.' }}
                </p>
              </div>

              <div class="md:col-span-2 p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/30">
                <div class="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 mb-1.5">
                  <UIcon name="i-lucide-alert-triangle" class="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  5. Pontos de atenção e pendências para conferência
                </div>
                <p class="text-amber-900/90 dark:text-amber-300/90 leading-relaxed">
                  {{ brief.decisionBlocks.pontosAtencaoPendencias || 'Nenhuma divergência identificada até o momento.' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Requisitos Detalhados com Evidências Auditadas -->
          <div v-if="brief.keyRequirements.length">
            <h3
              class="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3"
            >
              Requisitos Detalhados com Evidências Auditadas
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                v-for="req in brief.keyRequirements"
                :key="req.id"
                class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50"
              >
                <div class="flex items-center justify-between mb-1.5">
                  <span class="font-semibold text-slate-900 dark:text-slate-100 text-xs">{{
                    req.title
                  }}</span>
                  <div class="flex items-center gap-1.5">
                    <UBadge
                      :color="req.status === 'extracted' ? 'success' : req.status === 'inferred' ? 'warning' : 'neutral'"
                      size="xs"
                      variant="subtle"
                    >
                      {{ req.status === 'extracted' ? 'Evidenciado' : req.status === 'inferred' ? 'Inferência' : 'Não localizado' }}
                    </UBadge>
                    <UBadge size="xs" variant="outline" color="neutral">{{ req.category }}</UBadge>
                  </div>
                </div>
                <p class="text-xs text-slate-700 dark:text-slate-300 mt-1">{{ req.description }}</p>
                <p
                  v-if="req.textExcerpt"
                  class="text-[11px] text-slate-600 dark:text-slate-400 italic mt-2 border-l-2 border-primary-500 pl-2 leading-relaxed"
                >
                  "{{ req.textExcerpt }}"
                  <span v-if="req.page" class="not-italic font-semibold text-slate-500 dark:text-slate-400">
                    ({{ req.sourceDocument || 'Doc' }}, Pág. {{ req.page }})
                  </span>
                </p>
                <p v-if="req.notes" class="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  {{ req.notes }}
                </p>
              </div>
            </div>
          </div>

          <!-- Riscos e Cuidados -->
          <div v-if="brief.risksAndCautions.length">
            <h3
              class="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-3"
            >
              Cuidados e Pontos de Atenção
            </h3>
            <ul class="space-y-2">
              <li
                v-for="(risk, idx) in brief.risksAndCautions"
                :key="idx"
                class="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-900 dark:text-amber-200 text-xs"
              >
                <UIcon
                  name="i-lucide-alert-triangle"
                  class="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"
                />
                <span>{{ risk.description }}</span>
              </li>
            </ul>
          </div>

          <!-- Próximos Passos -->
          <div v-if="brief.suggestedNextSteps.length">
            <h3
              class="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2"
            >
              Próximos Passos Sugeridos
            </h3>
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
          <UButton size="sm" color="primary" @click="() => refreshBrief()">
            Carregar análise documental
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
