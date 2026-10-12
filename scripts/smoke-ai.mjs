import { environment } from '../packages/config/src/index.ts';
import {
  MockAIProvider,
  OpenAIProvider,
  GeminiProvider,
  AIModelRouter,
} from '../packages/document-intelligence/src/index.ts';
import { tenderRequirementsExtractionSchema } from '../packages/contracts/src/index.ts';
import { inputSchemas } from '../packages/contracts/src/openapi.ts';

console.log('--- SMOKE TEST: INTELIGÊNCIA ARTIFICIAL ---');
const env = environment();

const providers = [
  new MockAIProvider(),
  new OpenAIProvider(env.OPENAI_API_KEY),
  new GeminiProvider(env.GEMINI_API_KEY),
];

const router = new AIModelRouter(providers);

console.log('Provedores registrados:');
for (const p of router.getRegisteredProviders()) {
  console.log(`- ${p.id.padEnd(10)} [${p.name}]: ${p.configured ? 'CONFIGURADO' : 'NÃO CONFIGURADO'}`);
}

const jsonSchema = inputSchemas.TenderRequirementsExtraction;

const prompt = {
  messages: [
    {
      role: 'system',
      content:
        'Você é um auditor de licitações públicas brasileiras (Lei 14.133/2021). Extraia os requisitos fáticos, objeto, habilitação e riscos em JSON estrito. NUNCA invente requisitos que não constem no texto.',
    },
    {
      role: 'user',
      content:
        'Pregão Eletrônico 45/2026: Aquisição de 50 computadores e 10 impressoras multifuncionais para a Secretaria Municipal de Educação em São Paulo/SP. Habilitação: SICAF ativo, regularidade fiscal CND Federal e FGTS, e comprovação de aptidão com 1 atestado de capacidade técnica. Prazo de impugnação de 3 dias úteis antes da abertura.',
    },
  ],
  jsonSchema,
  schemaName: 'TenderRequirementsExtraction',
};

// Test active default provider
const target = router.resolveModelAndProvider('document.requirements_extraction');
console.log(`\nTestando provedor resolvido para a tarefa: ${target.providerId} (modelo: ${target.model})`);

try {
  const result = await router.executeWithFallback(
    'document.requirements_extraction',
    prompt,
    tenderRequirementsExtractionSchema,
  );

  console.log('\n[SUCESSO] Resposta estruturada recebida:');
  console.log(`- Provedor: ${result.provider}`);
  console.log(`- Modelo: ${result.model}`);
  console.log(`- Latência: ${result.latencyMs} ms`);
  console.log(`- Tokens: ${result.inputTokens} in / ${result.outputTokens} out (total: ${result.totalTokens})`);
  console.log(`- Custo estimado: $${result.costUsd.toFixed(6)} USD`);
  console.log('\n--- Resumo e Requisitos Extraídos ---');
  console.log(`Resumo: ${result.data.summary}`);
  console.log(`Local de Execução: ${JSON.stringify(result.data.executionPlace)}`);
  console.log(`Requisitos identificados (${result.data.requirements.length}):`);
  for (const r of result.data.requirements) {
    console.log(`  • [${r.category}] ${r.title}: ${r.description} (status: ${r.status})`);
  }
  console.log(`Riscos identificados (${result.data.risks.length}):`);
  for (const r of result.data.risks) {
    console.log(`  ⚠ [${r.severity.toUpperCase()}] ${r.description}`);
  }
} catch (error) {
  console.error('\n[FALHA]:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
