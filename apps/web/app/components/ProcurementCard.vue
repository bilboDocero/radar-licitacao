<script setup lang="ts">
defineProps<{ item: Procurement; reasons?: string[] }>();
</script>
<template>
  <article class="procurement-card">
    <div class="flex items-center gap-2">
      <UBadge color="neutral" variant="subtle" size="sm">{{ item.sourceId.toUpperCase() }}</UBadge
      ><UBadge
        v-if="item.status === 'open' && item.deadline && new Date(item.deadline) > new Date()"
        color="success"
        variant="subtle"
        size="sm"
        >Recebendo propostas</UBadge
      ><UBadge v-else color="neutral" variant="subtle" size="sm">Consulte o prazo</UBadge
      ><span class="text-xs text-slate-400 dark:text-slate-500 ml-auto">{{ item.agencyState }}</span>
    </div>
    <h3>
      <NuxtLink :to="`/app/licitacoes/${item.id}`" class="hover:text-primary-500 transition-colors">{{ item.title }}</NuxtLink>
    </h3>
    <div class="procurement-meta">
      <span>{{ item.agency }}</span
      ><span>Prazo: {{ formatDate(item.deadline) }}</span
      ><span class="font-semibold text-primary-600 dark:text-primary-400">{{ formatMoney(item.estimatedValue) }}</span>
    </div>
    <ul v-if="reasons" class="mt-3 flex gap-2 flex-wrap">
      <li
        v-for="reason in reasons"
        :key="reason"
        class="text-xs text-primary-800 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/50 rounded px-2 py-1"
      >
        {{ reason }}
      </li>
    </ul>
  </article>
</template>
