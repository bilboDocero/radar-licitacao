import { environment } from '../packages/config/src/index.ts';
import {
  MockAIProvider,
  OpenAIProvider,
  GeminiProvider,
  AIModelRouter,
} from '../packages/document-intelligence/src/index.ts';
import { procurementAIAnalysisSchema } from '../packages/contracts/src/index.ts';

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

const prompt = {
  messages: [
    { role: 'system', content: 'Você é um assistente de extração de licitações. Retorne JSON estruturado.' },
    { role: 'user', content: 'Pregão Eletrônico 45/2026: Aquisição de 50 computadores e notebooks para a Secretaria de Educação.' },
  ],
  schemaName: 'ProcurementAIAnalysis',
};

// Test active default provider
const target = router.resolveModelAndProvider('document.requirements_extraction');
console.log(`\nTestando provedor resolvido para a tarefa: ${target.providerId} (modelo: ${target.model})`);

try {
  const result = await router.executeWithFallback(
    'document.requirements_extraction',
    prompt,
    procurementAIAnalysisSchema,
  );

  console.log('\n[SUCESSO] Resposta estruturada recebida:');
  console.log(`- Provedor: ${result.provider}`);
  console.log(`- Modelo: ${result.model}`);
  console.log(`- Latência: ${result.latencyMs} ms`);
  console.log(`- Tokens: ${result.inputTokens} in / ${result.outputTokens} out (total: ${result.totalTokens})`);
  console.log(`- Custo estimado: $${result.costUsd.toFixed(6)} USD`);
  console.log('- Dados retornados:');
  console.dir(result.data, { depth: null });
} catch (error) {
  console.error('\n[FALHA]:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

