import { BrasilApiAdapter } from '../apps/api/src/modules/organizations/company-registry/brasilapi.adapter.ts';
import { organizationRegistryViewSchema } from '../packages/contracts/src/index.ts';

console.log('--- SMOKE TEST: ENRIQUECIMENTO CADASTRAL (BRASILAPI) ---');

const adapter = new BrasilApiAdapter();
const testCnpj = '00000000000191'; // Banco do Brasil S.A.

console.log(`Consultando CNPJ público: ${testCnpj} na BrasilAPI...`);

try {
  const start = Date.now();
  const result = await adapter.fetchRegistry(testCnpj);
  const latency = Date.now() - start;

  // Validação estrita do schema Zod
  organizationRegistryViewSchema.parse(result);

  console.log('\n[SUCESSO] Dados cadastrais normalizados com sucesso:');
  console.log(`- CNPJ: ${result.cnpj}`);
  console.log(`- Razão Social: ${result.legalName}`);
  console.log(`- Nome Fantasia: ${result.tradeName || 'Não informado'}`);
  console.log(`- Situação: ${result.registrationStatus}`);
  console.log(`- Porte: ${result.companySize}`);
  console.log(`- Data de Abertura: ${result.openedAt}`);
  console.log(`- Matriz/Filial: ${result.establishmentType}`);
  console.log(`- Capital Social: R$ ${Number(result.shareCapital).toLocaleString('pt-BR')}`);
  console.log(`- CNAE Principal: [${result.primaryActivity?.code}] ${result.primaryActivity?.description}`);
  console.log(`- CNAEs Secundários: ${result.secondaryActivities.length} atividade(s)`);
  console.log(`- Localização: ${result.address.street}, ${result.address.number || 'S/N'} - ${result.address.city}/${result.address.state} (CEP: ${result.address.postalCode})`);
  console.log(`- Fonte: ${result.source} (latência: ${latency}ms)`);
} catch (err) {
  console.error('\n[FALHA]:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
