<script setup lang="ts">
definePageMeta({ layout: 'auth', middleware: 'auth' });
const { api, activeOrganization } = useRadar();
const token = String(useRoute().params.token);
const error = ref('');
const done = ref(false);
const busy = ref(false);
async function accept() {
  busy.value = true;
  try {
    await api(`partners/invitations/${token}/accept`, { method: 'POST' });
    done.value = true;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <h1>Um convite para crescer.</h1>
  <p>
    Ao aceitar, sua empresa será vinculada comercialmente ao parceiro. Seus perfis, favoritos e
    alertas continuam privados.
  </p>
  <UAlert v-if="error" color="error" :title="error" class="mt-5" /><UAlert
    v-if="done"
    color="success"
    title="Empresa vinculada com sucesso"
    class="mt-5"
  /><UButton v-else-if="activeOrganization" :loading="busy" class="mt-6" @click="accept"
    >Aceitar vínculo comercial</UButton
  ><UButton v-else to="/onboarding" class="mt-6">Cadastre sua empresa primeiro</UButton
  ><NuxtLink to="/app" class="block mt-6 text-sm text-primary-600 dark:text-primary-400 hover:underline">Ir para o painel →</NuxtLink>
</template>
