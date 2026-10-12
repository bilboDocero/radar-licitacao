<script setup lang="ts">
import type { OrganizationRegistryView } from '@radar/contracts';

const props = defineProps<{ section: string }>();
const radar = useRadar();
const toast = useToast();
const { user } = useUserSession();

const showAllSecondary = ref(false);
const refreshing = ref(false);
const newCnpj = ref('');
const savingCnpj = ref(false);
const cnpjError = ref('');

const { data, pending, error, refresh } = await useAsyncData(
  `account-${props.section}`,
  async () => ({
    subscription: await radar.api<{
      subscription: { status: string; trialEndsAt: string };
      plan: { name: string; entitlements: Record<string, string | number | boolean> };
    }>('subscription'),
    profiles: await radar.api<
      {
        id: string;
        name: string;
        coverage: { national: boolean; states: string[]; municipalities: string[] };
      }[]
    >('profiles'),
    registry:
      props.section === 'empresa'
        ? await radar
            .api<{ configured: boolean; cnpj: string | null } & Partial<OrganizationRegistryView>>(
              'organizations/current/registry',
            )
            .catch(() => null)
        : null,
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

function formatCep(cep: string | null | undefined): string {
  if (!cep) return 'Não informado';
  const clean = cep.replace(/\D/g, '');
  if (clean.length === 8) return `${clean.slice(0, 5)}-${clean.slice(5)}`;
  return cep;
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return 'Não informado';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  if (clean.length === 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return phone;
}

function handleNewCnpjInput(event: Event) {
  const target = event.target as HTMLInputElement;
  newCnpj.value = maskCnpjInput(target.value);
}

async function refreshRegistry() {
  refreshing.value = true;
  try {
    const updated = await radar.api<{ configured: boolean; cnpj: string | null } & Partial<OrganizationRegistryView>>(
      'organizations/current/registry?refresh=true',
    );
    if (data.value) {
      data.value.registry = updated;
    }
    toast.add({ title: 'Dados cadastrais atualizados com sucesso', color: 'success' });
  } catch (err) {
    toast.add({ title: errorMessage(err), color: 'error' });
  } finally {
    refreshing.value = false;
  }
}

async function saveCnpj() {
  cnpjError.value = '';
  const clean = newCnpj.value.replace(/\D/g, '');
  if (clean.length !== 14) {
    cnpjError.value = 'Informe um CNPJ válido com 14 dígitos.';
    return;
  }

  savingCnpj.value = true;
  try {
    await radar.api('organizations/current', {
      method: 'PATCH',
      body: { cnpj: clean },
    });
    await radar.loadOrganizations();
    await refresh();
    toast.add({ title: 'CNPJ cadastrado com sucesso', color: 'success' });
  } catch (err) {
    cnpjError.value = errorMessage(err);
  } finally {
    savingCnpj.value = false;
  }
}
</script>

<template>
  <PageHeading :title="heading[0]" :description="heading[1]" />

  <AsyncState :pending="pending" :error="error" @retry="refresh">
    <section class="panel">
      <!-- ABA: ASSINATURA -->
      <template v-if="section === 'assinatura'">
        <UBadge color="success" variant="subtle" size="md">{{
          data?.subscription.subscription.status === 'trial'
            ? 'Em avaliação'
            : data?.subscription.subscription.status
        }}</UBadge>
        <h2 class="text-3xl font-semibold mt-5 text-slate-900 dark:text-slate-100">
          Plano {{ data?.subscription.plan.name }}
        </h2>
        <p class="hint mt-3 text-slate-600 dark:text-slate-400">
          Avaliação até {{ formatDate(data?.subscription.subscription.trialEndsAt || null) }}.
          Nenhuma cobrança automática.
        </p>
        <dl class="mt-7 space-y-3 text-sm">
          <div class="flex gap-5 py-2 border-b border-slate-100 dark:border-slate-800">
            <dt class="text-slate-600 dark:text-slate-400 font-medium">Perfis comerciais:</dt>
            <dd class="text-slate-900 dark:text-slate-100 font-semibold">{{ data?.subscription.plan.entitlements['commercial_profiles.max_count'] }}</dd>
          </div>
          <div class="flex gap-5 py-2 border-b border-slate-100 dark:border-slate-800">
            <dt class="text-slate-600 dark:text-slate-400 font-medium">Abrangência nacional:</dt>
            <dd class="text-slate-900 dark:text-slate-100 font-semibold">
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
          color="neutral"
          variant="subtle"
          title="Contratação ainda não habilitada"
          description="O provedor de pagamentos precisa ser configurado antes da contratação de um plano pago."
        />
      </template>

      <!-- ABA: COBERTURA -->
      <template v-else-if="section === 'cobertura'">
        <AsyncState
          :empty="!data?.profiles.length"
          title="Defina onde sua empresa atua"
          description="A área comercial é configurada em cada perfil."
        >
          <template #action><UButton to="/app/perfil-comercial" color="primary">Criar perfil</UButton></template>
          <article
            v-for="profile in data?.profiles"
            :key="profile.id"
            class="py-4 border-b border-slate-100 dark:border-slate-800"
          >
            <h2 class="font-semibold text-slate-900 dark:text-slate-100">{{ profile.name }}</h2>
            <p class="hint mt-2 text-slate-600 dark:text-slate-400">
              {{
                profile.coverage.national
                  ? 'Área comercial nacional'
                  : profile.coverage.states.join(', ') || profile.coverage.municipalities.join(', ')
              }}
            </p>
          </article>
        </AsyncState>
        <p class="hint mt-5 text-slate-500 dark:text-slate-400">
          Abrangência comercial não significa monitoramento integral de todos os portais. Veja o
          escopo em Fontes monitoradas.
        </p>
      </template>

      <!-- ABA: EMPRESA (ENRIQUECIDA COM CORES CLARAS NO LIGHT E ESCURAS NO DARK) -->
      <template v-else-if="section === 'empresa'">
        <div class="space-y-8">
          <!-- Cabeçalho Interno da Organização -->
          <div class="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-3 flex-wrap">
                <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ radar.organization.value?.name }}</h2>
                <UBadge color="primary" variant="subtle" size="sm">
                  Papel: {{ radar.organization.value?.role?.toUpperCase() }}
                </UBadge>
                <UBadge
                  v-if="data?.registry?.configured && data?.registry?.registrationStatus"
                  :color="data.registry.registrationStatus === 'ATIVA' ? 'success' : 'error'"
                  variant="subtle"
                  size="sm"
                >
                  {{ data.registry.registrationStatus }}
                </UBadge>
              </div>
              <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Acesso vinculado ao usuário: <span class="text-slate-900 dark:text-slate-200 font-medium">{{ user?.email }}</span>
              </p>
            </div>

            <div class="flex items-center gap-3">
              <UButton
                v-if="data?.registry?.configured"
                size="xs"
                variant="outline"
                color="neutral"
                icon="i-lucide-refresh-cw"
                :loading="refreshing"
                @click="refreshRegistry"
              >
                Atualizar dados
              </UButton>
              <UButton to="/onboarding" variant="ghost" size="xs" color="neutral">
                Trocar ou cadastrar outra
              </UButton>
            </div>
          </div>

          <!-- SEÇÃO 1: CASO A ORGANIZAÇÃO NÃO POSSUA CNPJ -->
          <div v-if="!data?.registry?.configured" class="p-6 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div class="flex items-start gap-4">
              <div class="p-3 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400">
                <UIcon name="i-lucide-building-2" class="w-6 h-6" />
              </div>
              <div class="space-y-4 max-w-xl">
                <div>
                  <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">CNPJ não cadastrado</h3>
                  <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Cadastre o CNPJ oficial da sua empresa para enriquecer automaticamente os dados cadastrais,
                    CNAEs e localização com base na Receita Federal.
                  </p>
                </div>

                <form
                  v-if="['owner', 'admin'].includes(radar.organization.value?.role || '')"
                  class="flex flex-col sm:flex-row gap-3 items-start"
                  @submit.prevent="saveCnpj"
                >
                  <div class="w-full sm:w-64">
                    <input
                      :value="newCnpj"
                      type="text"
                      inputmode="numeric"
                      placeholder="00.000.000/0000-00"
                      maxlength="18"
                      class="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary-500 font-mono"
                      @input="handleNewCnpjInput"
                    />
                  </div>
                  <UButton type="submit" size="sm" color="primary" :loading="savingCnpj">
                    Salvar CNPJ
                  </UButton>
                </form>
                <p v-if="cnpjError" class="text-xs text-red-600 dark:text-red-400">{{ cnpjError }}</p>
              </div>
            </div>
          </div>

          <!-- SEÇÃO 2: DADOS CADASTRAIS ENRIQUECIDOS -->
          <div v-else class="space-y-6">
            <!-- Grid de Identificação Principal -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                <p class="stat-label">CNPJ</p>
                <p class="text-base font-semibold font-mono text-slate-900 dark:text-slate-100 mt-2">
                  {{ formatCnpj(data.registry.cnpj) }}
                </p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {{ data.registry.establishmentType || 'Estabelecimento' }}
                </p>
              </div>

              <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                <p class="stat-label">Razão Social</p>
                <p class="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-2 line-clamp-2">
                  {{ data.registry.legalName || radar.organization.value?.name }}
                </p>
                <p v-if="data.registry.tradeName" class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                  Fantasia: {{ data.registry.tradeName }}
                </p>
              </div>

              <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                <p class="stat-label">Porte Empresarial</p>
                <p class="text-base font-semibold text-slate-900 dark:text-slate-100 mt-2">
                  {{ data.registry.companySize || 'Não informado' }}
                </p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Abertura: {{ formatDate(data.registry.openedAt || null) }}
                </p>
              </div>

              <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                <p class="stat-label">Capital Social</p>
                <p class="text-base font-semibold text-primary-700 dark:text-primary-400 mt-2">
                  {{ data.registry.shareCapital ? formatMoney(data.registry.shareCapital) : 'Não informado' }}
                </p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {{ data.registry.legalNature || 'Natureza não informada' }}
                </p>
              </div>
            </div>

            <!-- Atividades Econômicas (CNAE) -->
            <div class="p-5 rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <UIcon name="i-lucide-briefcase" class="w-4 h-4 text-primary-500" />
                  Atividades Econômicas (CNAE)
                </h3>
                <UBadge
                  v-if="data.registry.secondaryActivities?.length"
                  size="xs"
                  variant="outline"
                  color="neutral"
                >
                  {{ data.registry.secondaryActivities.length }} secundárias
                </UBadge>
              </div>

              <!-- CNAE Principal -->
              <div class="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
                <p class="text-[11px] uppercase tracking-wider text-primary-700 dark:text-primary-400 font-semibold mb-1">
                  Atividade Principal
                </p>
                <div v-if="data.registry.primaryActivity" class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <span class="font-mono text-xs font-semibold px-2 py-1 bg-slate-200 dark:bg-slate-900 rounded text-slate-800 dark:text-slate-200">
                    {{ data.registry.primaryActivity.code }}
                  </span>
                  <span class="text-sm text-slate-900 dark:text-slate-100 font-medium">
                    {{ data.registry.primaryActivity.description }}
                  </span>
                </div>
                <p v-else class="text-xs text-slate-500 dark:text-slate-400">Atividade principal não informada.</p>
              </div>

              <!-- CNAEs Secundários -->
              <div v-if="data.registry.secondaryActivities?.length" class="mt-4">
                <div class="space-y-2">
                  <div
                    v-for="(cnae, idx) in (showAllSecondary ? data.registry.secondaryActivities : data.registry.secondaryActivities.slice(0, 3))"
                    :key="idx"
                    class="flex items-start gap-3 p-2.5 rounded bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/80 text-xs"
                  >
                    <span class="font-mono text-[11px] text-slate-600 dark:text-slate-400 shrink-0 font-semibold">
                      {{ cnae.code }}
                    </span>
                    <span class="text-slate-800 dark:text-slate-200">{{ cnae.description }}</span>
                  </div>
                </div>

                <div v-if="data.registry.secondaryActivities.length > 3" class="mt-3">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="primary"
                    :icon="showAllSecondary ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                    @click="showAllSecondary = !showAllSecondary"
                  >
                    {{ showAllSecondary ? 'Ocultar atividades secundárias' : `Ver todas as ${data.registry.secondaryActivities.length} atividades secundárias` }}
                  </UButton>
                </div>
              </div>
            </div>

            <!-- Localização e Informações de Contato -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Endereço -->
              <div class="p-5 rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-3">
                  <UIcon name="i-lucide-map-pin" class="w-4 h-4 text-primary-500" />
                  Localização da Sede
                </h3>
                <dl class="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  <div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <dt class="text-slate-500 dark:text-slate-400">Logradouro:</dt>
                    <dd class="text-right font-medium text-slate-900 dark:text-slate-100">
                      {{ data.registry.address?.street || 'Não informado' }}
                      {{ data.registry.address?.number ? `, nº ${data.registry.address.number}` : '' }}
                      {{ data.registry.address?.complement ? ` (${data.registry.address.complement})` : '' }}
                    </dd>
                  </div>
                  <div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <dt class="text-slate-500 dark:text-slate-400">Bairro:</dt>
                    <dd class="text-right font-medium text-slate-900 dark:text-slate-100">{{ data.registry.address?.neighborhood || 'Não informado' }}</dd>
                  </div>
                  <div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <dt class="text-slate-500 dark:text-slate-400">Município / UF:</dt>
                    <dd class="text-right font-medium text-slate-900 dark:text-slate-100">
                      {{ data.registry.address?.city || 'Não informado' }} / {{ data.registry.address?.state || 'UF' }}
                    </dd>
                  </div>
                  <div class="flex justify-between py-1.5">
                    <dt class="text-slate-500 dark:text-slate-400">CEP:</dt>
                    <dd class="text-right font-mono font-medium text-slate-900 dark:text-slate-100">{{ formatCep(data.registry.address?.postalCode) }}</dd>
                  </div>
                </dl>
              </div>

              <!-- Informações Tributárias e Contato -->
              <div class="p-5 rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-3">
                  <UIcon name="i-lucide-info" class="w-4 h-4 text-primary-500" />
                  Regime Tributário & Contato
                </h3>
                <dl class="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  <div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 items-center">
                    <dt class="text-slate-500 dark:text-slate-400">Simples Nacional:</dt>
                    <dd class="font-medium">
                      <UBadge
                        :color="data.registry.simpleTaxRegime === true ? 'success' : 'neutral'"
                        size="xs"
                        variant="subtle"
                      >
                        {{ data.registry.simpleTaxRegime === true ? 'Optante' : data.registry.simpleTaxRegime === false ? 'Não optante' : 'Não informado' }}
                      </UBadge>
                    </dd>
                  </div>
                  <div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 items-center">
                    <dt class="text-slate-500 dark:text-slate-400">Enquadramento MEI:</dt>
                    <dd class="font-medium">
                      <UBadge
                        :color="data.registry.mei === true ? 'success' : 'neutral'"
                        size="xs"
                        variant="subtle"
                      >
                        {{ data.registry.mei === true ? 'Sim' : data.registry.mei === false ? 'Não' : 'Não informado' }}
                      </UBadge>
                    </dd>
                  </div>
                  <div class="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <dt class="text-slate-500 dark:text-slate-400">E-mail público:</dt>
                    <dd class="text-right font-medium text-slate-900 dark:text-slate-100">{{ data.registry.email || 'Não informado' }}</dd>
                  </div>
                  <div class="flex justify-between py-1.5">
                    <dt class="text-slate-500 dark:text-slate-400">Telefone:</dt>
                    <dd class="text-right font-medium text-slate-900 dark:text-slate-100">{{ formatPhone(data.registry.phone) }}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <!-- Metadados de Origem da Consulta -->
            <div class="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-2">
              <div class="flex items-center gap-2">
                <span>Fonte cadastral:</span>
                <UBadge size="xs" variant="outline" color="neutral">
                  {{ data.registry.source === 'brasilapi' ? 'BrasilAPI (Receita Federal)' : data.registry.source === 'cnpjws' ? 'CNPJ.ws (Receita Federal)' : 'Mock local' }}
                </UBadge>
                <span v-if="data.registry.isCached" class="text-primary-700 dark:text-primary-400 font-medium">· Em cache (7 dias)</span>
              </div>
              <div>
                Última consulta: {{ new Date(data.registry.fetchedAt || '').toLocaleString('pt-BR') }}
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ABA: CONFIGURAÇÕES -->
      <template v-else-if="section === 'configuracoes'">
        <h2 class="panel-title text-slate-900 dark:text-slate-100">{{ user?.name }}</h2>
        <p class="hint text-slate-600 dark:text-slate-400">{{ user?.email }}</p>
        <UButton to="/recuperar-senha" variant="outline" color="neutral" class="mt-5">Gerenciar senha</UButton>
        <p class="hint mt-5 text-slate-500 dark:text-slate-400">
          A seleção da empresa ativa está no cabeçalho. A troca de tema também está disponível no
          cabeçalho.
        </p>
      </template>

      <!-- ABA: AJUDA -->
      <template v-else>
        <ol class="space-y-5 text-sm text-slate-700 dark:text-slate-300">
          <li>
            1. Cadastre um
            <NuxtLink to="/app/perfil-comercial" class="text-primary-600 dark:text-primary-400 underline font-medium">
              perfil comercial
            </NuxtLink>
            com palavras-chave e região.
          </li>
          <li>
            2. Explore o
            <NuxtLink to="/app/radar" class="text-primary-600 dark:text-primary-400 underline font-medium">
              catálogo de oportunidades
            </NuxtLink>.
          </li>
          <li>3. Salve licitações e acompanhe as notificações.</li>
          <li>4. Consulte sempre o edital no portal oficial antes de participar.</li>
        </ol>
        <UButton to="/faq" variant="outline" color="neutral" class="mt-7">Perguntas frequentes</UButton>
      </template>
    </section>
  </AsyncState>
</template>
