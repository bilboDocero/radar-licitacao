<script setup lang="ts">
const props = defineProps<{ section: string }>();
const content: Record<string, [string, string, string]> = {
  cadastro: [
    'Seu próximo contrato começa com um perfil.',
    'Crie sua conta no serviço de identidade. Depois da confirmação de e-mail, você poderá cadastrar sua empresa e iniciar a avaliação.',
    'Criar minha conta',
  ],
  'verificar-email': [
    'Confira sua caixa de entrada.',
    'O serviço de identidade envia um link de confirmação. No ambiente local, os e-mails ficam no Mailpit em localhost:8025. Conclua a confirmação para acessar o Radar.',
    'Continuar acesso',
  ],
  'recuperar-senha': [
    'Recupere seu acesso.',
    'Abra a tela de acesso e escolha “Esqueceu sua senha?”. Você receberá instruções no e-mail cadastrado. No ambiente local, consulte o Mailpit.',
    'Abrir recuperação',
  ],
  'redefinir-senha': [
    'Escolha uma nova senha.',
    'A redefinição acontece no link seguro enviado pelo serviço de identidade. Se o link expirou, solicite uma nova recuperação.',
    'Solicitar novo link',
  ],
};
const item = computed(() => content[props.section]!);
useSeoMeta({ title: () => item.value[0] });
</script>
<template>
  <span class="eyebrow">SUA CONTA NO RADAR</span>
  <h1 class="mt-4">{{ item[0] }}</h1>
  <p>{{ item[1] }}</p>
  <UButton
    :to="section === 'cadastro' ? '/auth/login?register=true' : '/auth/login'"
    external
    block
    size="lg"
    class="mt-8"
    trailing-icon="i-lucide-arrow-right"
    >{{ item[2] }}</UButton
  ><NuxtLink to="/entrar" class="text-sm text-emerald-700 block mt-6 text-center"
    >Voltar para o acesso</NuxtLink
  >
</template>
