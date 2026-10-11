<script setup lang="ts">
const { api } = useRadar();
const enabled = ref(true);
const toast = useToast();
const { data, pending, error, refresh } = await useAsyncData('alerts', async () => {
  const [items, preferences] = await Promise.all([
    api<
      {
        id: string;
        message: string;
        readAt: string | null;
        procurementId: string;
        createdAt: string;
      }[]
    >('notifications'),
    api<{ enabled: boolean; frequency: string }>('alert-preferences'),
  ]);
  enabled.value = preferences.enabled;
  return items;
});
async function save() {
  try {
    await api('alert-preferences', {
      method: 'PUT',
      body: { enabled: enabled.value, frequency: 'daily' },
    });
    toast.add({ title: 'Preferência salva', color: 'success' });
  } catch (e) {
    toast.add({ title: errorMessage(e), color: 'error' });
  }
}
async function read(id: string) {
  try {
    await api(`notifications/${id}/read`, { method: 'PUT' });
    await refresh();
  } catch (e) {
    toast.add({ title: errorMessage(e), color: 'error' });
  }
}
</script>
<template>
  <PageHeading
    title="Novidades no seu radar"
    description="Novas correspondências e atualizações relevantes, reunidas em um só lugar."
  />
  <div class="panel mb-5 flex gap-5 items-center flex-wrap">
    <USwitch v-model="enabled" label="Receber notificações na plataforma" /><UButton
      variant="outline"
      @click="save"
      >Salvar preferência</UButton
    >
    <p class="hint">Resumo por e-mail e outros canais ainda não estão disponíveis.</p>
  </div>
  <section class="panel">
    <AsyncState
      :pending="pending"
      :error="error"
      :empty="!data?.length"
      title="Tudo tranquilo por aqui"
      description="Quando uma oportunidade combinar com seus perfis, ela aparecerá nesta lista."
      icon="i-lucide-bell"
      @retry="refresh"
      ><article v-for="item in data" :key="item.id" class="py-5 border-b border-slate-100">
        <NuxtLink :to="`/app/licitacoes/${item.procurementId}`" class="text-sm font-medium">{{
          item.message
        }}</NuxtLink>
        <div class="flex gap-4 mt-3 items-center">
          <span class="hint">{{ formatDate(item.createdAt) }}</span
          ><UButton v-if="!item.readAt" variant="ghost" size="xs" @click="read(item.id)"
            >Marcar como lida</UButton
          ><span v-else class="hint">Lida</span>
        </div>
      </article></AsyncState
    >
  </section>
</template>
