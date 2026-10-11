<script setup lang="ts">
defineProps<{
  pending?: boolean;
  error?: unknown;
  empty?: boolean;
  title?: string;
  description?: string;
  icon?: string;
}>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <div v-if="pending" aria-live="polite" class="p-8 space-y-4">
    <USkeleton class="h-5 w-1/2" /><USkeleton class="h-24 w-full" /><span class="sr-only"
      >Carregando</span
    >
  </div>
  <UAlert
    v-else-if="error"
    color="error"
    title="Não foi possível carregar"
    :description="errorMessage(error)"
    icon="i-lucide-circle-alert"
    ><template #actions
      ><UButton color="error" variant="outline" @click="$emit('retry')"
        >Tentar novamente</UButton
      ></template
    ></UAlert
  >
  <div v-else-if="empty" class="empty-state">
    <div class="empty-icon"><UIcon :name="icon || 'i-lucide-radar'" /></div>
    <h3>{{ title || 'Seu próximo passo começa aqui' }}</h3>
    <p>{{ description || 'Ainda não há registros para apresentar.' }}</p>
    <slot name="action" />
  </div>
  <slot v-else />
</template>
