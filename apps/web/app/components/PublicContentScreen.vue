<script setup lang="ts">
import { publicContent, faq } from '~/data/public-content';
const props = defineProps<{ section: string }>();
const content = computed(() => publicContent[props.section]);
const { api } = useRadar();
interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: string | null;
  entitlements: Record<string, number | string | boolean>;
}
const { data, pending, error, refresh } = await useAsyncData(`public-${props.section}`, async () =>
  props.section === 'planos'
    ? await api<Plan[]>('plans')
    : props.section === 'cobertura'
      ? await api<{
          sources: { id: string; name: string; coverageNote: string; cursor: string | null }[];
        }>('sources')
      : null,
);
const plans = computed(() => (Array.isArray(data.value) ? (data.value as Plan[]) : []));
const sources = computed(() =>
  !Array.isArray(data.value)
    ? (
        data.value as {
          sources?: { id: string; name: string; coverageNote: string; cursor: string | null }[];
        } | null
      )?.sources || []
    : [],
);
useSeoMeta({
  title: () =>
    content.value?.title ||
    {
      faq: 'Perguntas frequentes',
      planos: 'Planos para sua área de atuação',
      cobertura: 'Cobertura e fontes',
    }[props.section] ||
    'Radar',
  description: () =>
    content.value?.description ||
    'Conheça o funcionamento, a cobertura e os planos do Radar de Licitações.',
});
</script>
<template>
  <section class="py-16 min-h-[65vh]">
    <template v-if="content"
      ><span class="eyebrow">CONHEÇA O RADAR</span>
      <h1 class="section-heading max-w-3xl">{{ content.title }}</h1>
      <p class="text-slate-500 mb-10 max-w-2xl">{{ content.description }}</p>
      <div class="prose-copy max-w-3xl space-y-6">
        <p v-for="paragraph in content.paragraphs" :key="paragraph">{{ paragraph }}</p>
      </div>
      <UButton to="/faq" variant="outline" class="mt-10">Perguntas frequentes</UButton></template
    ><template v-else-if="section === 'faq'"
      ><span class="eyebrow">RESPOSTAS COM CLAREZA</span>
      <h1 class="section-heading">Antes de começar, tire suas dúvidas.</h1>
      <p class="text-slate-500 mb-10">O que o Radar faz, como funciona e o que vem depois.</p>
      <UAccordion :items="faq" class="max-w-3xl" /></template
    ><template v-else-if="section === 'planos'"
      ><span class="eyebrow">CRESÇA NO SEU RITMO</span>
      <h1 class="section-heading">O alcance certo para sua empresa.</h1>
      <p class="text-slate-500 mb-10">
        Planos parametrizáveis. Contratação paga ainda não habilitada.
      </p>
      <AsyncState :pending="pending" :error="error" :empty="!plans.length" @retry="refresh"
        ><div class="feature-grid">
          <article v-for="plan in plans" :key="plan.id" class="panel">
            <UBadge variant="subtle" :color="plan.id === 'regional' ? 'success' : 'neutral'">{{
              plan.name
            }}</UBadge>
            <h2 class="text-2xl font-semibold mt-6">
              {{ plan.monthlyPrice ? formatMoney(plan.monthlyPrice) : 'Em definição' }}
            </h2>
            <p class="!text-sm mt-3">{{ plan.description }}</p>
            <ul class="space-y-4 my-7 text-sm">
              <li>
                ✓ {{ plan.entitlements['commercial_profiles.max_count'] }} perfil(is) comercial(is)
              </li>
              <li>
                ✓
                {{
                  plan.entitlements['coverage.national']
                    ? 'Área comercial nacional'
                    : `${plan.entitlements['coverage.max_municipalities']} município(s) / ${plan.entitlements['coverage.max_states']} UF(s)`
                }}
              </li>
              <li>✓ Notificações na plataforma</li>
              <li>✓ Favoritos da empresa</li>
            </ul>
            <UButton to="/cadastro" block variant="outline">Avaliar o Radar</UButton>
          </article>
        </div></AsyncState
      >
      <p class="hint mt-8">
        A avaliação de 14 dias utiliza o plano Nacional, sem cartão e sem cobrança. Abrangência
        comercial não representa cobertura integral de fontes.
      </p></template
    ><template v-else
      ><span class="eyebrow">FONTES E ABRANGÊNCIA</span>
      <h1 class="section-heading">Saiba de onde vem cada oportunidade.</h1>
      <p class="text-slate-500 mb-10 max-w-2xl">
        Monitoramento com escopo declarado. A coleta é compartilhada e não é executada separadamente
        para cada cliente.
      </p>
      <AsyncState :pending="pending" :error="error" :empty="!sources.length" @retry="refresh"
        ><article v-for="source in sources" :key="source.id" class="panel max-w-3xl mb-5">
          <UBadge variant="subtle">{{ source.id.toUpperCase() }}</UBadge>
          <h2 class="text-xl font-semibold mt-4">{{ source.name }}</h2>
          <p class="hint mt-4">{{ source.coverageNote }}</p>
          <p class="hint mt-4">
            Última sincronização concluída:
            {{ source.cursor ? formatDate(source.cursor) : 'Nenhuma execução concluída' }}
          </p>
        </article></AsyncState
      >
      <p class="hint max-w-2xl">
        A frequência depende da operação do coletor e da disponibilidade da API oficial. Novas
        fontes são homologadas antes de serem ativadas.
      </p></template
    >
  </section>
</template>
