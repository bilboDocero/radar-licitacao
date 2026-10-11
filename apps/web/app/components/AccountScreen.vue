<script setup lang="ts">
const props = defineProps<{ section: string }>();
const radar = useRadar();
const { user } = useUserSession();
const { data, pending, error, refresh } = await useAsyncData(
  `account-${props.section}`,
  async () => ({
    subscription: await radar.api<{
      subscription: { status: string; trialEndsAt: string };
      plan: { name: string; entitlements: Record<string, string | number | boolean> };
    }>('subscription'),
    profiles:
      await radar.api<
        {
          id: string;
          name: string;
          coverage: { national: boolean; states: string[]; municipalities: string[] };
        }[]
      >('profiles'),
  }),
);
const titles: Record<string, [string, string]> = {
  cobertura: ['Sua área de atuação', 'Cobertura comercial configurada nos seus perfis.'],
  assinatura: [
    'Um plano para o seu alcance',
    'Direitos de uso e situação da assinatura da empresa.',
  ],
  empresa: ['Sua empresa no Radar', 'Dados da organização ativa e seu papel de acesso.'],
  configuracoes: ['Sua conta, seu acesso', 'Identidade gerenciada pelo serviço de autenticação.'],
  ajuda: ['Como podemos ajudar?', 'Orientações para começar a usar seu Radar.'],
};
const heading = computed(() => titles[props.section]!);
</script>
<template>
  <PageHeading :title="heading[0]" :description="heading[1]" /><AsyncState
    :pending="pending"
    :error="error"
    @retry="refresh"
    ><section class="panel">
      <template v-if="section === 'assinatura'"
        ><UBadge color="success" variant="subtle">{{
          data?.subscription.subscription.status === 'trial'
            ? 'Em avaliação'
            : data?.subscription.subscription.status
        }}</UBadge>
        <h2 class="text-3xl font-semibold mt-5">Plano {{ data?.subscription.plan.name }}</h2>
        <p class="hint mt-3">
          Avaliação até {{ formatDate(data?.subscription.subscription.trialEndsAt || null) }}.
          Nenhuma cobrança automática.
        </p>
        <dl class="mt-7 space-y-3 text-sm">
          <div class="flex gap-5">
            <dt>Perfis comerciais</dt>
            <dd>{{ data?.subscription.plan.entitlements['commercial_profiles.max_count'] }}</dd>
          </div>
          <div class="flex gap-5">
            <dt>Abrangência nacional</dt>
            <dd>
              {{
                data?.subscription.plan.entitlements['coverage.national']
                  ? 'Disponível'
                  : 'Não incluída'
              }}
            </dd>
          </div>
        </dl>
        <UAlert
          class="mt-7"
          color="info"
          title="Contratação ainda não habilitada"
          description="O provedor de pagamentos precisa ser configurado antes da contratação de um plano pago." /></template
      ><template v-else-if="section === 'cobertura'"
        ><AsyncState
          :empty="!data?.profiles.length"
          title="Defina onde sua empresa atua"
          description="A área comercial é configurada em cada perfil."
          ><template #action><UButton to="/app/perfil-comercial">Criar perfil</UButton></template>
          <article
            v-for="profile in data?.profiles"
            :key="profile.id"
            class="py-4 border-b border-slate-100"
          >
            <h2 class="font-semibold">{{ profile.name }}</h2>
            <p class="hint mt-3">
              {{
                profile.coverage.national
                  ? 'Área comercial nacional'
                  : profile.coverage.states.join(', ') || profile.coverage.municipalities.join(', ')
              }}
            </p>
          </article></AsyncState
        >
        <p class="hint mt-5">
          Abrangência comercial não significa monitoramento integral de todos os portais. Veja o
          escopo em Fontes monitoradas.
        </p></template
      ><template v-else-if="section === 'empresa'"
        ><h2 class="text-2xl font-semibold">{{ radar.organization.value?.name }}</h2>
        <dl class="space-y-4 mt-7 text-sm">
          <div>CNPJ: {{ radar.organization.value?.cnpj || 'Não informado' }}</div>
          <div>Seu papel: {{ radar.organization.value?.role }}</div>
          <div>Usuário: {{ user?.email }}</div>
        </dl>
        <UButton to="/onboarding" variant="outline" class="mt-7">Cadastrar outra empresa</UButton>
        <p class="hint mt-5">
          Convites de membros e edição cadastral serão adicionados na próxima entrega.
        </p></template
      ><template v-else-if="section === 'configuracoes'"
        ><h2 class="panel-title">{{ user?.name }}</h2>
        <p class="hint">{{ user?.email }}</p>
        <UButton to="/recuperar-senha" variant="outline" class="mt-5">Gerenciar senha</UButton>
        <p class="hint mt-5">
          A seleção da empresa ativa está no cabeçalho. A troca de tema também está disponível no
          cabeçalho.
        </p></template
      ><template v-else
        ><ol class="space-y-5 text-sm">
          <li>
            1. Cadastre um
            <NuxtLink to="/app/perfil-comercial" class="text-emerald-700 underline"
              >perfil comercial</NuxtLink
            >
            com palavras-chave e região.
          </li>
          <li>
            2. Explore o
            <NuxtLink to="/app/radar" class="text-emerald-700 underline"
              >catálogo de oportunidades</NuxtLink
            >.
          </li>
          <li>3. Salve licitações e acompanhe as notificações.</li>
          <li>4. Consulte sempre o edital no portal oficial antes de participar.</li>
        </ol>
        <UButton to="/faq" variant="outline" class="mt-7">Perguntas frequentes</UButton></template
      >
    </section></AsyncState
  >
</template>
