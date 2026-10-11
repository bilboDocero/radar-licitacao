<script setup lang="ts">
const props = defineProps<{ area?: 'app' | 'admin' | 'parceiro' }>();
const { user } = useUserSession();
const radar = useRadar();
const open = ref(false);
const links = computed(() =>
  props.area === 'admin'
    ? [
        ['/admin', 'Visão geral', 'layout-dashboard'],
        ['/admin/empresas', 'Empresas', 'building-2'],
        ['/admin/parceiros', 'Parceiros', 'handshake'],
        ['/admin/fontes', 'Fontes', 'radio-tower'],
        ['/admin/solicitacoes', 'Solicitações', 'inbox'],
        ['/admin/coletores', 'Coletores', 'activity'],
        ['/admin/licitacoes', 'Licitações', 'files'],
        ['/admin/planos', 'Planos', 'credit-card'],
        ['/admin/auditoria', 'Auditoria', 'shield-check'],
      ]
    : props.area === 'parceiro'
      ? [
          ['/parceiro', 'Visão comercial', 'layout-dashboard'],
          ['/parceiro/clientes', 'Meus clientes', 'building-2'],
          ['/parceiro/convites', 'Convites', 'mail-plus'],
          ['/parceiro/assinaturas', 'Assinaturas', 'credit-card'],
          ['/parceiro/configuracoes', 'Marca e conta', 'settings'],
        ]
      : [
          ['/app', 'Visão geral', 'layout-dashboard'],
          ['/app/radar', 'Radar de oportunidades', 'radar'],
          ['/app/favoritos', 'Favoritos', 'bookmark'],
          ['/app/alertas', 'Alertas', 'bell'],
          ['/app/perfil-comercial', 'Perfil comercial', 'sliders-horizontal'],
          ['/app/cobertura', 'Minha cobertura', 'map'],
          ['/app/fontes', 'Fontes monitoradas', 'radio-tower'],
          ['/app/assinatura', 'Assinatura', 'credit-card'],
          ['/app/empresa', 'Minha empresa', 'building-2'],
        ],
);
async function logout() {
  await $fetch('/api/logout', { method: 'POST' });
  await useUserSession().clear();
  await navigateTo('/');
}
function switchOrganization(event: Event) {
  radar.activeOrganization.value = (event.target as HTMLSelectElement).value;
  reloadNuxtApp();
}
</script>
<template>
  <div class="app-shell">
    <aside class="sidebar" :class="{ open }">
      <NuxtLink to="/" class="wordmark">radar.<small>MVP</small></NuxtLink>
      <p class="nav-caption">
        {{
          area === 'admin'
            ? 'ADMINISTRAÇÃO'
            : area === 'parceiro'
              ? 'ÁREA DO PARCEIRO'
              : 'SEU ESPAÇO DE NEGÓCIOS'
        }}
      </p>
      <nav aria-label="Navegação do painel">
        <NuxtLink
          v-for="[to, label, icon] in links"
          :key="to"
          :to="to"
          class="side-link"
          @click="open = false"
          ><UIcon :name="`i-lucide-${icon}`" class="size-4" />{{ label }}</NuxtLink
        >
      </nav>
      <div class="sidebar-bottom">
        <NuxtLink to="/app/ajuda" class="flex items-center gap-2 mb-4"
          ><UIcon name="i-lucide-circle-help" />Central de ajuda</NuxtLink
        ><NuxtLink v-if="user?.roles.includes('platform-admin')" to="/admin" class="block mb-3"
          >Administração →</NuxtLink
        >
        <p>Informação pública.<br />Visão para o seu negócio.</p>
      </div>
    </aside>
    <div class="workspace">
      <header class="app-header">
        <div class="header-org">
          <UButton
            icon="i-lucide-menu"
            color="neutral"
            variant="ghost"
            aria-label="Abrir menu"
            class="mobile-menu"
            @click="open = !open"
          /><UIcon name="i-lucide-building-2" class="size-4 text-emerald-700" /><select
            v-if="radar.organizations.value.length"
            :value="radar.activeOrganization.value"
            aria-label="Empresa ativa"
            @change="switchOrganization"
          >
            <option v-for="org in radar.organizations.value" :key="org.id" :value="org.id">
              {{ org.name }}
            </option></select
          ><span v-else>Minha conta</span
          ><UBadge variant="subtle" color="neutral" size="sm">{{
            area === 'app' || !area ? 'Workspace' : area
          }}</UBadge>
        </div>
        <div class="flex items-center gap-4">
          <UColorModeButton /><span class="hidden md:block text-xs text-slate-500">{{
            user?.name
          }}</span
          ><UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-log-out"
            aria-label="Sair"
            @click="logout"
          />
        </div>
      </header>
      <main class="app-content"><slot /></main>
    </div>
  </div>
</template>
