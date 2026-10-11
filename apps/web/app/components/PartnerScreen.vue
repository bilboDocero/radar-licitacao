<script setup lang="ts">
defineProps<{ section: string }>();
const { api } = useRadar();
const { data, pending, error, refresh } = await useAsyncData('partner', () =>
  api<{
    partner: { name: string; brandName: string | null };
    clients: { id: string; name: string; planId: string; status: string }[];
    invitations: { id: string; email: string; expiresAt: string; acceptedAt: string | null }[];
  }>('partners/me'),
);
const email = ref('');
const link = ref('');
const busy = ref(false);
const message = ref('');
async function invite() {
  busy.value = true;
  message.value = '';
  try {
    const result = await api<{ path: string }>('partners/invitations', {
      method: 'POST',
      body: { email: email.value },
    });
    link.value = window.location.origin + result.path;
    await refresh();
  } catch (e) {
    message.value = errorMessage(e);
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <PageHeading
    :title="section === 'index' ? 'Seu espaço de crescimento' : `Parceiro · ${section}`"
    description="Acompanhe os vínculos comerciais sem acessar os dados privados das empresas."
  /><AsyncState :pending="pending" :error="error" @retry="refresh"
    ><div v-if="section === 'index'" class="stats">
      <div class="panel">
        <p class="stat-label">Clientes vinculados</p>
        <p class="stat-value">{{ data?.clients.length }}</p>
      </div>
      <div class="panel">
        <p class="stat-label">Convites enviados</p>
        <p class="stat-value">{{ data?.invitations.length }}</p>
      </div>
    </div>
    <section class="panel">
      <template v-if="section === 'convites'"
        ><h2 class="panel-title">Convidar uma empresa</h2>
        <form class="form-grid" @submit.prevent="invite">
          <label>E-mail do responsável<input v-model="email" type="email" required /></label
          ><UButton type="submit" :loading="busy">Gerar link de convite</UButton
          ><UAlert v-if="message" color="error" :title="message" /><label v-if="link"
            >Copie e compartilhe este link<input :value="link" readonly
          /></label>
          <p class="hint">
            Validade de sete dias. O convite vincula comercialmente a empresa e não concede acesso
            aos seus perfis ou favoritos.
          </p>
        </form>
        <ul class="mt-6 text-sm space-y-3">
          <li v-for="invitation in data?.invitations" :key="invitation.id">
            {{ invitation.email }} · {{ invitation.acceptedAt ? 'Aceito' : 'Pendente' }} ·
            {{ formatDate(invitation.expiresAt) }}
          </li>
        </ul></template
      ><template v-else-if="section === 'configuracoes'"
        ><h2 class="panel-title">{{ data?.partner.name }}</h2>
        <p class="hint">Marca: {{ data?.partner.brandName || 'Não configurada' }}</p>
        <p class="hint mt-4">
          Alterações de marca são realizadas pela administração. White label e domínio próprio
          pertencem a uma etapa futura.
        </p></template
      ><template v-else
        ><h2 class="panel-title">Empresas vinculadas</h2>
        <AsyncState
          :empty="!data?.clients.length"
          title="Sua carteira começa com um convite"
          description="Convide empresas para criar um vínculo comercial com seu parceiro."
          ><template #action
            ><UButton to="/parceiro/convites" variant="outline">Criar convite</UButton></template
          >
          <table class="data-table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Plano</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="client in data?.clients" :key="client.id">
                <td>{{ client.name }}</td>
                <td>{{ client.planId }}</td>
                <td>{{ client.status }}</td>
              </tr>
            </tbody>
          </table></AsyncState
        ></template
      >
    </section></AsyncState
  >
</template>
