<script setup lang="ts">
definePageMeta({ layout: 'auth', middleware: 'auth' });
useSeoMeta({ title: 'Cadastre sua empresa' });
const name = ref('');
const cnpj = ref('');
const busy = ref(false);
const mounted = ref(false);
onMounted(() => { mounted.value = true; });
const error = ref('');
const radar = useRadar();
async function submit() {
  busy.value = true;
  error.value = '';
  try {
    const org = await radar.api<Organization>('organizations', {
      method: 'POST',
      body: { name: name.value, ...(cnpj.value ? { cnpj: cnpj.value.replace(/\D/g, '') } : {}) },
    });
    radar.activeOrganization.value = org.id;
    await radar.loadOrganizations();
    await navigateTo('/app/perfil-comercial');
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <span class="eyebrow">01 / SUA EMPRESA</span>
  <h1 class="mt-4">Um radar com o seu perfil.</h1>
  <p>
    Comece cadastrando a empresa que vai acompanhar as oportunidades. A avaliação de 14 dias será
    iniciada após o cadastro.
  </p>
  <form class="form-grid mt-8" @submit.prevent="submit">
    <label
      >Nome da empresa<input
        v-model="name"
        required
        minlength="3"
        maxlength="160"
        autocomplete="organization"
        placeholder="Como sua empresa se chama?" /></label
    ><label
      >CNPJ <span class="hint">Opcional nesta etapa</span
      ><input
        v-model="cnpj"
        inputmode="numeric"
        placeholder="Somente números"
        pattern="[0-9]{14}"
        maxlength="14" /></label
    ><UAlert v-if="error" color="error" :title="error" /><UButton
      type="submit"
      size="lg"
      :loading="busy"
      :disabled="!mounted"
      trailing-icon="i-lucide-arrow-right"
      >Criar empresa e continuar</UButton
    >
  </form>
</template>
