<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
const { api } = useRadar();

interface AIOverviewData {
  summary: {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    totalTokens: number;
    totalCostUsd: string;
    avgLatencyMs: number;
  };
  providers: Array<{
    id: string;
    name: string;
    configured: boolean;
  }>;
  recentCalls: Array<{
    id: string;
    provider: string;
    model: string;
    taskType: string;
    totalTokens: number;
    latencyMs: number;
    costUsd: string;
    status: string;
    errorMessage: string | null;
    createdAt: string;
  }>;
}

const { data, pending, error, refresh } = await useAsyncData('admin-ai-overview', () =>
  api<AIOverviewData>('admin/ai/overview'),
);
</script>

<template>
  <PageHeading
    title="Inteligência Artificial & Custos"
    description="Observabilidade, consumo de tokens, roteamento de modelos e custos em USD."
    eyebrow="ADMINISTRAÇÃO DA IA"
  />

  <AsyncState :pending="pending" :error="error" @retry="refresh">
    <template v-if="data">
      <!-- Métricas Gerais -->
      <div class="stats mb-6">
        <div class="panel">
          <p class="stat-label">Total de Chamadas</p>
          <p class="text-2xl mt-2 font-bold text-slate-900 dark:text-slate-100">{{ data.summary.totalCalls }}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {{ data.summary.successfulCalls }} sucesso / {{ data.summary.failedCalls }} falhas
          </p>
        </div>
        <div class="panel">
          <p class="stat-label">Tokens Consumidos</p>
          <p class="text-2xl mt-2 font-bold text-slate-900 dark:text-slate-100">{{ data.summary.totalTokens.toLocaleString('pt-BR') }}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Entrada + Saída somados</p>
        </div>
        <div class="panel">
          <p class="stat-label">Custo Total Estimado</p>
          <p class="text-2xl mt-2 font-bold text-primary-600 dark:text-primary-400">${{ Number(data.summary.totalCostUsd).toFixed(4) }} USD</p>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Cálculo por taxa de tokens</p>
        </div>
        <div class="panel">
          <p class="stat-label">Latência Média</p>
          <p class="text-2xl mt-2 font-bold text-slate-900 dark:text-slate-100">{{ data.summary.avgLatencyMs }} ms</p>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Tempo de resposta dos modelos</p>
        </div>
      </div>

      <!-- Provedores Registrados -->
      <section class="panel mb-6">
        <h2 class="panel-title mb-3 text-slate-900 dark:text-slate-100">Provedores e Adapters Registrados</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            v-for="p in data.providers"
            :key="p.id"
            class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 flex items-center justify-between"
          >
            <div>
              <p class="font-semibold text-slate-900 dark:text-slate-100 text-sm">{{ p.name }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">id: {{ p.id }}</p>
            </div>
            <UBadge
              :color="p.configured ? 'success' : 'neutral'"
              variant="subtle"
              size="sm"
            >
              {{ p.configured ? 'Configurado' : 'Sem chave' }}
            </UBadge>
          </div>
        </div>
      </section>

      <!-- Histórico Recente de Chamadas -->
      <section class="panel">
        <div class="flex items-center justify-between mb-4">
          <h2 class="panel-title text-slate-900 dark:text-slate-100">Chamadas Recentes de IA</h2>
          <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-refresh-cw" @click="() => refresh()">Atualizar</UButton>
        </div>

        <div v-if="!data.recentCalls.length" class="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
          Nenhuma chamada de IA registrada até o momento.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="text-[11px] text-slate-600 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th class="py-2.5 px-3">Data</th>
                <th class="py-2.5 px-3">Provedor / Modelo</th>
                <th class="py-2.5 px-3">Tarefa</th>
                <th class="py-2.5 px-3">Tokens</th>
                <th class="py-2.5 px-3">Latência</th>
                <th class="py-2.5 px-3">Custo USD</th>
                <th class="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              <tr v-for="call in data.recentCalls" :key="call.id" class="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td class="py-2.5 px-3 whitespace-nowrap">{{ new Date(call.createdAt).toLocaleTimeString('pt-BR') }}</td>
                <td class="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-slate-100">{{ call.provider }} / {{ call.model }}</td>
                <td class="py-2.5 px-3">{{ call.taskType }}</td>
                <td class="py-2.5 px-3 font-mono">{{ call.totalTokens }}</td>
                <td class="py-2.5 px-3 font-mono">{{ call.latencyMs }} ms</td>
                <td class="py-2.5 px-3 font-mono font-medium text-primary-700 dark:text-primary-400">${{ Number(call.costUsd).toFixed(6) }}</td>
                <td class="py-2.5 px-3">
                  <UBadge :color="call.status === 'success' ? 'success' : 'error'" size="xs" variant="subtle">
                    {{ call.status }}
                  </UBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </AsyncState>
</template>
