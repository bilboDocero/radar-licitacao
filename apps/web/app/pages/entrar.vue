<script setup lang="ts">
definePageMeta({ layout: 'auth' });
useSeoMeta({ title: 'Acesse sua conta' });
</script>
<template>
  <span class="eyebrow">BEM-VINDO AO SEU RADAR</span>
  <h1 class="mt-4">Vamos encontrar<br />novas possibilidades.</h1>
  <p>Acesse sua conta para acompanhar as oportunidades da sua empresa.</p>
  <UAlert
    v-if="$route.query.erro === 'email_nao_verificado'"
    color="warning"
    title="E-mail ainda não confirmado"
    description="Confirme seu e-mail para ativar a conta. Em ambiente local, acesse o Mailpit em http://localhost:8025 e clique no link de ativação recebido."
    class="mt-5"
  />
  <UAlert
    v-else-if="$route.query.erro === 'servico_indisponivel'"
    color="error"
    title="Serviço temporariamente indisponível"
    description="Não foi possível comunicar com a API do Radar. Verifique se os serviços locais estão rodando."
    class="mt-5"
  />
  <UAlert
    v-else-if="$route.query.erro"
    color="error"
    title="Não foi possível entrar"
    description="A sessão expirou, foi cancelada ou ocorreu um conflito de credenciais. Tente entrar novamente."
    class="mt-5"
  />
  <UButton
    to="/auth/login"
    external
    block
    size="xl"
    class="mt-8"
    trailing-icon="i-lucide-arrow-right"
    >Entrar na minha conta</UButton
  >
  <div class="mt-4 flex items-center justify-between text-xs text-slate-400">
    <NuxtLink to="/auth/logout" external class="hover:text-slate-200 underline">
      Limpar sessão anterior do Keycloak
    </NuxtLink>
    <NuxtLink to="/cadastro" class="text-primary-600 dark:text-primary-400 font-semibold hover:underline">
      Criar nova conta
    </NuxtLink>
  </div>
  <NuxtLink to="/recuperar-senha" class="block text-center mt-4 text-sm text-slate-500"
    >Esqueci minha senha</NuxtLink
  >
  <div class="mt-10 panel">
    <p class="!text-xs">
      Ambiente local: use <strong>demo@radar.local</strong> com a senha
      <strong>RadarLocal123!</strong>. As contas de demonstração existem apenas nesta instalação de
      desenvolvimento.
    </p>
  </div>
</template>
