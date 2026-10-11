import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
// Generates only thin route entrypoints. Behavior belongs to the screen components.
const routes = {};
for (const page of [
  'funcionalidades',
  'planos',
  'cobertura',
  'faq',
  'contato',
  'termos-de-uso',
  'privacidade',
])
  routes[page] = ['', `<PublicContentScreen section="${page}" />`];
for (const page of ['cadastro', 'verificar-email', 'recuperar-senha', 'redefinir-senha'])
  routes[page] = ["layout: 'auth'", `<AuthInfoScreen section="${page}" />`];
for (const [page, component] of Object.entries({
  index: 'DashboardScreen',
  radar: 'RadarScreen',
  favoritos: 'FavoritesScreen',
  alertas: 'AlertsScreen',
  'perfil-comercial': 'ProfileScreen',
  fontes: 'SourcesScreen',
}))
  routes[`app/${page}`] = ["layout: 'application', middleware: 'auth'", `<${component} />`];
for (const page of ['cobertura', 'assinatura', 'empresa', 'configuracoes', 'ajuda'])
  routes[`app/${page}`] = [
    "layout: 'application', middleware: 'auth'",
    `<AccountScreen section="${page}" />`,
  ];
for (const page of ['index', 'clientes', 'convites', 'assinaturas', 'configuracoes'])
  routes[`parceiro/${page}`] = [
    "layout: 'partner', middleware: ['auth', 'partner']",
    `<PartnerScreen section="${page}" />`,
  ];
for (const page of [
  'index',
  'empresas',
  'parceiros',
  'fontes',
  'solicitacoes',
  'coletores',
  'licitacoes',
  'planos',
  'auditoria',
])
  routes[`admin/${page}`] = [
    "layout: 'admin', middleware: ['auth', 'admin']",
    `<AdminScreen section="${page}" />`,
  ];
for (const [name, [meta, template]] of Object.entries(routes)) {
  const path = `apps/web/app/pages/${name}.vue`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${meta ? `<script setup lang="ts">definePageMeta({${meta}});</script>\n` : ''}<template>${template}</template>\n`,
  );
}
console.log(`Created ${Object.keys(routes).length} route entrypoints.`);
