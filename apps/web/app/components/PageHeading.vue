<script setup lang="ts">
defineProps<{ title: string; description: string; eyebrow?: string }>();
</script>
<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">{{ eyebrow || 'RADAR DE LICITAÇÕES' }}</span>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </div>
    <slot />
  </div>
</template>
