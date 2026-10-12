<script setup lang="ts">
definePageMeta({ layout: 'application', middleware: 'auth' });
useSeoMeta({ title: 'Painel de Debug e Background' });

const config = useRuntimeConfig();
if (!config.public.debugMode) {
  await navigateTo('/app');
}

const { api } = useRadar();
const toast = useToast();

interface DebugStatus {
  debugMode: boolean;
  collector: {
    enabled: boolean;
    intervalMs: number;
    lastRun: {
      id: string;
      sourceId: string;
      status: string;
      records: number;
      error: string | null;
      startedAt: string;
      finishedAt: string | null;
    } | null;
    cursor: string | null;
    totalProcurements: number;
  };
  outbox: {
    pendingCount: number;
    dispatchedCount: number;
    recentEvents: Array<{
      id: string;
      type: string;
      payload: unknown;
      createdAt: string;
      dispatchedAt: string | null;
    }>;
  };
  queues: {
    collection: Record<string, number>;
    matching: Record<string, number>;
  };
  matching: {
    totalMatches: number;
    orgMatches: number;
    orgAlerts: number;
  };
  ai: {
    enabled: boolean;
    provider: string;
    model: string;
    totalAnalyses: number;
    totalBriefs: number;
    usageSummary: {
      totalCalls: number;
      successfulCalls: number;
      failedCalls: number;
      totalTokens: number;
      totalCostUsd: string;
      avgLatencyMs: number;
    };
  };
  registry: {
    cnpjWsRateLimitRemaining: number;
  };
}

const { data: status, pending, error, refresh } = await useAsyncData('debug-status', () =>
  api<DebugStatus>('debug/status'),
);

const loadingCollector = ref(false);
const loadingResetCursor = ref(false);
const loadingDrainOutbox = ref(false);
const loadingReindex = ref(false);
const loadingAlert = ref(false);
const loadingAiSmoke = ref(false);
const loadingClearAi = ref(false);
const loadingClearCnpj = ref(false);
const loadingToggleCollector = ref(false);
const loadingQueueAction = ref(false);
const loadingAdvanced = ref(false);
const collectorEnabled = ref(false);
const queueName = ref<'collection' | 'matching'>('matching');
const procurementId = ref('');
const profileId = ref('');
const cnpj = ref('');
const cnpjSource = ref<'brasilapi' | 'cnpjws' | 'mock'>('brasilapi');
const failureMode = ref('none');
const briefJson = ref<unknown>(null);

const aiSmokeResult = ref<any>(null);

watch(status, (value) => {
  if (value) collectorEnabled.value = value.collector.enabled;
}, { immediate: true });

async function triggerCollector() {
  loadingCollector.value = true;
  try {
    const res = await api<{ message: string }>('debug/collector/trigger', { method: 'POST' });
    toast.add({ title: res.message, color: 'success' });
    await refresh();
  } catch (err) {
    toast.add({ title: errorMessage(err), color: 'error' });
  } finally {
    loadingCollector.value = false;
  }
}

async function resetCursor() {
  loadingResetCursor.value = true;
  try {
    const res = await api<{ message: string }>('debug/collector/reset-cursor', {
      method: 'POST',
      body: { days: 2 },
    });
    toast.add({ title: res.message, color: 'success' });
    await refresh();
  } catch (err) {
    toast.add({ title: errorMessage(err), color: 'error' });
  } finally {
    loadingResetCursor.value = false;
  }
}

async function drainOutbox() {
  loadingDrainOutbox.value = true;
  try {
    const res = await api<{ message: string }>('debug/outbox/drain', { method: 'POST' });
    toast.add({ title: res.message, color: 'success' });
    await refresh();
  } catch (err) {
    toast.add({ title: errorMessage(err), color: 'error' });
  } finally {
    loadingDrainOutbox.value = false;
  }
}

async function reindexMatching() {
  loadingReindex.value = true;
  try {
    const res = await api<{ message: string }>('debug/matching/reindex', { method: 'POST' });
    toast.add({ title: res.message, color: 'success' });
    await refresh();
  } catch (err) {
    toast.add({ title: errorMessage(err), color: 'error' });
  } finally {
    loadingReindex.value = false;
  }
}

async function simulateAlert() {
  loadingAlert.value = true;
  try {
    const res = await api<{ message: string }>('debug/alerts/simulate', { method: 'POST' });
    toast.add({ title: res.message, color: 'success' });
    await refresh();
  } catch (err) {
    toast.add({ title: errorMessage(err), color: 'error' });
  } finally {
    loadingAlert.value = false;
  }
}

async function runAiSmoke() {
  loadingAiSmoke.value = true;
  aiSmokeResult.value = null;
  try {
    const res = await api<any>('debug/ai/smoke', { method: 'POST' });
    aiSmokeResult.value = res;
    toast.add({ title: 'Inferência de IA concluída com sucesso', color: 'success' });
    await refresh();
  } catch (err) {
    toast.add({ title: errorMessage(err), color: 'error' });
  } finally {
    loadingAiSmoke.value = false;
  }
}

async function clearAiCache() {
  loadingClearAi.value = true;
  try {
    const res = await api<{ message: string }>('debug/cache/clear-ai', { method: 'POST' });
    toast.add({ title: res.message, color: 'success' });
    await refresh();
  } catch (err) {
    toast.add({ title: errorMessage(err), color: 'error' });
  } finally {
    loadingClearAi.value = false;
  }
}

async function clearCnpjCache() {
  loadingClearCnpj.value = true;
  try {
    const res = await api<{ message: string }>('debug/cache/clear-cnpj', { method: 'POST' });
    toast.add({ title: res.message, color: 'success' });
    await refresh();
  } catch (err) {
    toast.add({ title: errorMessage(err), color: 'error' });
  } finally {
    loadingClearCnpj.value = false;
  }
}

async function toggleCollector() {
  loadingToggleCollector.value = true;
  try {
    const res = await api<{ message: string }>('debug/collector/toggle', { method: 'POST', body: { enabled: collectorEnabled.value } });
    toast.add({ title: res.message, color: 'success' });
    await refresh();
  } catch (err) { toast.add({ title: errorMessage(err), color: 'error' }); }
  finally { loadingToggleCollector.value = false; }
}

async function queueAction(action: 'retry-failed' | 'clear-failed') {
  loadingQueueAction.value = true;
  try {
    const res = await api<{ message?: string; retriedCount?: number; removedCount?: number }>(`debug/queues/${action}`, { method: 'POST', body: { queue: queueName.value } });
    toast.add({ title: res.message || `${res.retriedCount ?? res.removedCount ?? 0} jobs processados`, color: 'success' });
    await refresh();
  } catch (err) { toast.add({ title: errorMessage(err), color: 'error' }); }
  finally { loadingQueueAction.value = false; }
}

async function advancedAction(path: string, body: Record<string, unknown>) {
  loadingAdvanced.value = true;
  try {
    const res = await api<{ message?: string; data?: unknown }>(path, { method: 'POST', body });
    if (path === 'debug/ai/mock-failure') toast.add({ title: res.message || 'Modo do Mock atualizado', color: 'success' });
    else toast.add({ title: res.message || 'Operação enfileirada', color: 'success' });
    await refresh();
  } catch (err) { toast.add({ title: errorMessage(err), color: 'error' }); }
  finally { loadingAdvanced.value = false; }
}

async function loadBriefJson() {
  loadingAdvanced.value = true;
  try { briefJson.value = await api('debug/ai/brief', { query: { procurementId: procurementId.value } }); }
  catch (err) { toast.add({ title: errorMessage(err), color: 'error' }); }
  finally { loadingAdvanced.value = false; }
}

async function lookupCnpj() {
  loadingAdvanced.value = true;
  try {
    briefJson.value = await api('debug/registry/lookup', { method: 'POST', body: { cnpj: cnpj.value, source: cnpjSource.value } });
    toast.add({ title: 'Consulta cadastral concluída', color: 'success' });
  } catch (err) { toast.add({ title: errorMessage(err), color: 'error' }); }
  finally { loadingAdvanced.value = false; }
}
</script>

<template>
  <PageHeading
    title="Controle de Background & Debug"
    description="Painel de controle manual para disparo de coletas, matching, outbox, IA e inspeção de filas."
    eyebrow="MODO DE DEPURAÇÃO"
  >
           <UButton
      variant="outline"
      color="neutral"
      icon="i-lucide-refresh-cw"
      size="sm"
      :loading="pending"
      @click="() => refresh()"
    >
      Atualizar Status
    </UButton>
  </PageHeading>

  <AsyncState :pending="pending" :error="error" @retry="refresh">
    <div v-if="status" class="space-y-6">
      <!-- Banner de Flag Ativa -->
      <div
        class="p-4 rounded-xl bg-primary-50/60 dark:bg-primary-950/20 border border-primary-200/80 dark:border-primary-900/40 flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400">
            <UIcon name="i-lucide-terminal" class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-slate-900 dark:text-slate-100">
              Modo de Depuração Ativo (DEBUG_MODE=true)
            </h2>
            <p class="text-xs text-slate-600 dark:text-slate-400">
              Recursos manuais de segundo plano habilitados para testes rápidos sem depender de terminal.
            </p>
          </div>
        </div>
        <UBadge color="success" variant="subtle" size="sm">Flag: ON</UBadge>
      </div>

      <!-- Grid de Status Rápido -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="panel">
          <p class="stat-label">Licitações no Catálogo</p>
          <p class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {{ status.collector.totalProcurements }}
          </p>
          <p class="text-[11px] text-slate-500 mt-1">Total no banco local</p>
        </div>

        <div class="panel">
          <p class="stat-label">Eventos na Outbox</p>
          <p class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {{ status.outbox.pendingCount }}
          </p>
          <p class="text-[11px] text-slate-500 mt-1">
            {{ status.outbox.dispatchedCount }} já despachados
          </p>
        </div>

        <div class="panel">
          <p class="stat-label">Matches da Sua Empresa</p>
          <p class="text-2xl font-bold text-primary-600 dark:text-primary-400 mt-2">
            {{ status.matching.orgMatches }}
          </p>
          <p class="text-[11px] text-slate-500 mt-1">
            {{ status.matching.totalMatches }} matches globais
          </p>
        </div>

        <div class="panel">
          <p class="stat-label">Custo Acumulado de IA</p>
          <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            ${{ Number(status.ai.usageSummary.totalCostUsd).toFixed(4) }}
          </p>
          <p class="text-[11px] text-slate-500 mt-1">
            {{ status.ai.usageSummary.totalCalls }} chamadas registradas
          </p>
        </div>
      </div>

      <!-- SEÇÃO 1: COLETA E INGESTÃO DO PNCP -->
      <section class="panel">
        <div class="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 class="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UIcon name="i-lucide-radio-tower" class="text-primary-500 w-5 h-5" />
              Coletor Oficial do PNCP
            </h2>
            <p class="text-xs text-slate-500">
              Controle manual de ingestão incremental da API do governo (/contratacoes/atualizacao).
            </p>
          </div>
          <UBadge
            :color="status.collector.enabled ? 'success' : 'neutral'"
            variant="subtle"
            size="sm"
          >
            Agendamento: {{ status.collector.enabled ? 'Ativo (Horário)' : 'Desativado (Manual)' }}
          </UBadge>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-xs">
          <div class="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
            <span class="text-slate-500 block mb-1">Última Execução de Coleta:</span>
            <p v-if="status.collector.lastRun" class="font-medium text-slate-800 dark:text-slate-200">
              Status: <span class="uppercase font-bold">{{ status.collector.lastRun.status }}</span> ·
              {{ status.collector.lastRun.records }} registros em
              {{ new Date(status.collector.lastRun.startedAt).toLocaleString('pt-BR') }}
            </p>
            <p v-else class="text-slate-400">Nenhuma execução registrada.</p>
          </div>

          <div class="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
            <span class="text-slate-500 block mb-1">Cursor de Data Atual (PNCP):</span>
            <p class="font-mono text-slate-800 dark:text-slate-200">
              {{ status.collector.cursor ? new Date(status.collector.cursor).toLocaleString('pt-BR') : 'Início padrão (lookback)' }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3 flex-wrap">
          <UButton
            color="primary"
            icon="i-lucide-play"
            :loading="loadingCollector"
            @click="triggerCollector"
          >
            Executar Coleta do PNCP Agora
          </UButton>
          <UButton
            variant="outline"
            color="neutral"
            icon="i-lucide-history"
            :loading="loadingResetCursor"
            @click="resetCursor"
           >
             Resetar Cursor de Data (2 dias atrás)
           </UButton>
           <UButton variant="outline" color="neutral" :loading="loadingToggleCollector" @click="toggleCollector">
             {{ collectorEnabled ? 'Desativar Coleta Automática' : 'Ativar Coleta Automática' }}
           </UButton>
         </div>
           <p class="text-xs text-slate-500 mt-3">Alterna apenas o agendador horário no Redis/BullMQ. O botão de coleta manual continua funcionando nos dois estados; reiniciar a API não é necessário.</p>
      </section>

      <!-- SEÇÃO 2: OUTBOX E MOTOR DE MATCHING -->
      <section class="panel">
        <div class="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 class="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UIcon name="i-lucide-sliders-horizontal" class="text-primary-500 w-5 h-5" />
              Outbox & Motor de Matching
            </h2>
            <p class="text-xs text-slate-500">
              Publicação de eventos da outbox para o BullMQ e recálculo de oportunidades compatíveis.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <UBadge color="neutral" variant="outline" size="xs">
              {{ status.outbox.pendingCount }} na fila
            </UBadge>
          </div>
        </div>

         <div class="flex items-center gap-3 flex-wrap mb-4">
          <UButton
            color="primary"
            variant="outline"
            icon="i-lucide-zap"
            :loading="loadingDrainOutbox"
            @click="drainOutbox"
          >
            Forçar Despacho da Outbox Imediato
          </UButton>
          <UButton
            color="primary"
            icon="i-lucide-rotate-cw"
            :loading="loadingReindex"
            @click="reindexMatching"
          >
            Re-executar Matching da Minha Empresa
          </UButton>
          <UButton
            variant="outline"
            color="neutral"
            icon="i-lucide-bell-ring"
            :loading="loadingAlert"
            @click="simulateAlert"
          >
            Simular Alerta de Teste
          </UButton>
         </div>
         <div class="debug-subpanel">
           <p class="stat-label">Filas BullMQ: estado e recuperação</p>
           <div class="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2 text-xs">
             <div v-for="state in ['waiting', 'active', 'delayed', 'failed', 'completed']" :key="state" class="metric-chip">
               <span>{{ state }}</span><strong>{{ status.queues.matching[state] || 0 }}</strong>
             </div>
           </div>
           <div class="flex flex-wrap items-end gap-3 mt-3">
             <UFormField label="Fila alvo" help="Escolha a fila cujos jobs falhos serão tratados.">
               <USelect v-model="queueName" :items="[{ label: 'radar-collection', value: 'collection' }, { label: 'radar-matching', value: 'matching' }]" />
             </UFormField>
             <UButton variant="outline" :loading="loadingQueueAction" @click="queueAction('retry-failed')">Reprocessar falhos</UButton>
             <UButton color="error" variant="outline" :loading="loadingQueueAction" @click="queueAction('clear-failed')">Limpar falhos</UButton>
           </div>
           <p class="text-xs text-slate-500 mt-3">Reprocessar chama o retry nativo do BullMQ. Limpar remove somente jobs em estado failed da fila selecionada; não apaga eventos da outbox nem dados do banco.</p>
         </div>

        <!-- Tabela dos últimos eventos da Outbox -->
        <div v-if="status.outbox.recentEvents.length" class="overflow-x-auto text-xs mt-3">
          <p class="stat-label mb-2">Últimos Eventos na Tabela outbox_events:</p>
          <table class="w-full text-left border-collapse">
            <thead class="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase text-[10px]">
              <tr>
                <th class="p-2">Data</th>
                <th class="p-2">Tipo de Evento</th>
                <th class="p-2">ID</th>
                <th class="p-2">Despachado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              <tr v-for="ev in status.outbox.recentEvents" :key="ev.id">
                <td class="p-2 whitespace-nowrap">{{ new Date(ev.createdAt).toLocaleTimeString('pt-BR') }}</td>
                <td class="p-2 font-mono font-medium">{{ ev.type }}</td>
                <td class="p-2 font-mono text-[10px] text-slate-400">{{ ev.id.slice(0, 8) }}...</td>
                <td class="p-2">
                  <UBadge :color="ev.dispatchedAt ? 'success' : 'warning'" size="xs" variant="subtle">
                    {{ ev.dispatchedAt ? 'Sim' : 'Pendente' }}
                  </UBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
       </section>

       <section class="panel">
         <div class="section-title"><div><h2>Controles avançados por identificador</h2><p>Use IDs reais copiados da URL ou do catálogo. As ações são assíncronas e retornam um jobId.</p></div></div>
         <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
           <UFormField label="ID da licitação (procurementId)" help="UUID do edital. Necessário para reindexação, análise e Brief.">
             <UInput v-model="procurementId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
           </UFormField>
           <UFormField label="ID do perfil (opcional)" help="UUID do perfil comercial. Vazio usa o primeiro perfil da empresa ativa.">
             <UInput v-model="profileId" placeholder="Opcional" />
           </UFormField>
         </div>
         <div class="flex flex-wrap gap-3 mt-4">
           <UButton :disabled="!procurementId" :loading="loadingAdvanced" @click="advancedAction('debug/matching/reindex-procurement', { procurementId })">Re-executar matching deste edital</UButton>
           <UButton variant="outline" :disabled="!procurementId" :loading="loadingAdvanced" @click="advancedAction('debug/ai/analyze', { procurementId })">Disparar análise documental</UButton>
           <UButton variant="outline" :disabled="!procurementId" :loading="loadingAdvanced" @click="advancedAction('debug/ai/brief/regenerate', { procurementId, profileId: profileId || undefined })">Regenerar Brief</UButton>
           <UButton variant="ghost" :disabled="!procurementId" :loading="loadingAdvanced" @click="loadBriefJson">Ver JSON bruto do Brief</UButton>
         </div>
         <pre v-if="briefJson" class="json-output">{{ JSON.stringify(briefJson, null, 2) }}</pre>
         <p class="text-xs text-slate-500 mt-3">A análise usa a versão atual e o cache compartilhado. A regeneração do Brief mantém o escopo da organização ativa e valida o perfil contra ela antes de enfileirar.</p>
       </section>

      <!-- SEÇÃO 3: INTELIGÊNCIA DOCUMENTAL & IA -->
      <section class="panel">
        <div class="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 class="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UIcon name="i-lucide-sparkles" class="text-primary-500 w-5 h-5" />
              Inteligência Artificial & Extração de Editais
            </h2>
            <p class="text-xs text-slate-500">
              Provedor ativo: <strong class="uppercase text-primary-600 dark:text-primary-400">{{ status.ai.provider }}</strong> · Modelo: <strong class="font-mono">{{ status.ai.model }}</strong>
            </p>
          </div>
          <UBadge color="neutral" variant="outline" size="sm">
            {{ status.ai.totalAnalyses }} análises · {{ status.ai.totalBriefs }} briefs
          </UBadge>
        </div>

         <div class="flex items-center gap-3 flex-wrap mb-4">
          <UButton
            color="primary"
            icon="i-lucide-flask-conical"
            :loading="loadingAiSmoke"
            @click="runAiSmoke"
          >
            Executar Smoke Test com {{ status.ai.provider.toUpperCase() }}
          </UButton>
          <UButton
            variant="outline"
            color="error"
            icon="i-lucide-trash-2"
            :loading="loadingClearAi"
            @click="clearAiCache"
          >
            Limpar Cache de Análises no Banco
          </UButton>
         </div>
         <div class="debug-subpanel mt-4">
           <UFormField label="Falha a injetar no Mock" help="Requer provedor Mock. Use none para restaurar o comportamento normal; os erros exercitam fallback e tratamento da UI.">
             <USelect v-model="failureMode" :items="['none', 'rate_limit_429', 'timeout', 'temporary_503', 'permanent_401', 'malformed_json', 'no_evidences', 'partial_response']" />
           </UFormField>
           <UButton class="mt-3" variant="outline" :loading="loadingAdvanced" @click="advancedAction('debug/ai/mock-failure', { mode: failureMode })">Aplicar falha simulada</UButton>
         </div>

        <!-- Resultado do Smoke Test de IA em tempo real -->
        <div
          v-if="aiSmokeResult"
          class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs space-y-2 mt-4"
        >
          <div class="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
            <span>Resultado da Inferência em Tempo Real:</span>
            <span class="text-primary-600 dark:text-primary-400 font-mono">
              {{ aiSmokeResult.latencyMs }}ms · {{ aiSmokeResult.tokens.total }} tokens (${{ aiSmokeResult.costUsd }} USD)
            </span>
          </div>
          <p class="text-slate-700 dark:text-slate-300">
            <strong>Resumo:</strong> {{ aiSmokeResult.data.summary }}
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            <div
              v-for="req in aiSmokeResult.data.requirements.slice(0, 4)"
              :key="req.id"
              class="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            >
              <div class="font-semibold text-slate-800 dark:text-slate-200">{{ req.title }}</div>
              <div class="text-[11px] text-slate-600 dark:text-slate-400">{{ req.description }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- SEÇÃO 4: ENRIQUECIMENTO CADASTRAL (CNPJ & REDIS) -->
      <section class="panel">
        <div class="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 class="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UIcon name="i-lucide-building-2" class="text-primary-500 w-5 h-5" />
              Enriquecimento Cadastral (BrasilAPI / CNPJ.ws)
            </h2>
            <p class="text-xs text-slate-500">
              Controle de cache de 7 dias e cota pública de 3 req/min no CNPJ.ws.
            </p>
          </div>
          <UBadge
            :color="status.registry.cnpjWsRateLimitRemaining > 0 ? 'success' : 'error'"
            variant="subtle"
            size="sm"
          >
            Cota CNPJ.ws: {{ status.registry.cnpjWsRateLimitRemaining }} de 3 restantes no minuto
          </UBadge>
        </div>

         <div class="flex items-center gap-3 flex-wrap">
          <UButton
            variant="outline"
            color="neutral"
            icon="i-lucide-eraser"
            :loading="loadingClearCnpj"
            @click="clearCnpjCache"
          >
            Limpar Cache de CNPJ no Redis
          </UButton>
          <UButton
            to="/app/empresa"
            variant="ghost"
            color="primary"
            icon="i-lucide-arrow-right"
          >
            Ir para Dados da Empresa →
          </UButton>
         </div>
         <div class="debug-subpanel mt-4">
           <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
             <UFormField label="CNPJ para consulta avulsa" help="Aceita números ou máscara; a consulta não altera o cadastro da empresa."><UInput v-model="cnpj" placeholder="00.000.000/0001-91" /></UFormField>
             <UFormField label="Fonte preferencial" help="BrasilAPI é a fonte primária; CNPJ.ws é fallback controlado."><USelect v-model="cnpjSource" :items="['brasilapi', 'cnpjws', 'mock']" /></UFormField>
           </div>
           <UButton class="mt-3" variant="outline" :disabled="!cnpj" :loading="loadingAdvanced" @click="lookupCnpj">Testar consulta de CNPJ</UButton>
         </div>
      </section>
    </div>
  </AsyncState>
</template>
