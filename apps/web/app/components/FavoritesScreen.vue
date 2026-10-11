<script setup lang="ts">
const { api } = useRadar();
const { data, pending, error, refresh } = await useAsyncData('favorites', () =>
  api<{ procurement: Procurement }[]>('favorites'),
);
const toast = useToast();
async function remove(id: string) {
  try {
    await api(`favorites/${id}`, { method: 'DELETE' });
    await refresh();
    toast.add({ title: 'Removida dos favoritos' });
  } catch (e) {
    toast.add({ title: errorMessage(e), color: 'error' });
  }
}
</script>
<template>
  <PageHeading
    title="Oportunidades que merecem atenção"
    description="Uma lista compartilhada com os membros da sua empresa."
  />
  <section class="panel">
    <AsyncState
      :pending="pending"
      :error="error"
      :empty="!data?.length"
      title="Sua lista está pronta para começar"
      description="Salve uma licitação na página de detalhes para encontrá-la aqui depois."
      icon="i-lucide-bookmark"
      @retry="refresh"
      ><template #action
        ><UButton to="/app/radar" variant="outline">Explorar o Radar</UButton></template
      >
      <div v-for="row in data" :key="row.procurement.id">
        <ProcurementCard :item="row.procurement" /><UButton
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-bookmark-minus"
          @click="remove(row.procurement.id)"
          >Remover dos favoritos</UButton
        >
      </div></AsyncState
    >
  </section>
</template>
