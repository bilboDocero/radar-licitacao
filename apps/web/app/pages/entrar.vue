<script setup lang="ts">
definePageMeta({ layout: 'auth' });
useSeoMeta({ title: 'Acesse sua conta' });
</script>
<template>
  <span class="eyebrow">BEM-VINDO AO SEU RADAR</span>
  <h1 class="mt-4">Vamos encontrar<br />novas possibilidades.</h1>
  <p>Acesse sua conta para acompanhar as oportunidades da sua empresa.</p>
  <UAlert
    v-if="$route.query.erro"
    color="error"
    title="Não foi possível entrar"
    description="Tente novamente e confirme a verificação do seu e-mail."
    class="mt-5"
  /><UButton
    to="/auth/login"
    external
    block
    size="xl"
    class="mt-8"
    trailing-icon="i-lucide-arrow-right"
    >Entrar na minha conta</UButton
  >
  <p class="mt-6 text-center">
    Ainda não tem conta?
    <NuxtLink to="/cadastro" class="text-emerald-700 font-semibold">Criar conta</NuxtLink>
  </p>
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
