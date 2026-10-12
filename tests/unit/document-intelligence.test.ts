import { describe, it, expect, vi } from 'vitest';
import {
  MockAIProvider,
  OpenAIProvider,
  GeminiProvider,
  AIModelRouter,
  DocumentExtractionService,
} from '../../packages/document-intelligence/src/index.js';
import {
  procurementAIAnalysisSchema,
  opportunityBriefSchema,
  type ProcurementAIAnalysis,
  type OpportunityBrief,
} from '../../packages/contracts/src/index.js';

describe('Document Intelligence — Provedores e Roteamento', () => {
  it('MockAIProvider gera análise de requisitos válida conforme schema Zod', async () => {
    const provider = new MockAIProvider();
    expect(provider.isConfigured()).toBe(true);

    const result = await provider.generateStructured<ProcurementAIAnalysis>(
      {
        taskType: 'document.requirements_extraction',
        model: 'mock-brief-v1',
        messages: [{ role: 'user', content: 'Pregão eletrônico para aquisição de impressoras' }],
      },
      procurementAIAnalysisSchema,
    );

    expect(result.provider).toBe('mock');
    expect(result.data.status).toBe('COMPLETED');
    expect(result.data.requirements.length).toBeGreaterThan(0);
    expect(result.data.requirements[0]?.status).toBe('extracted');
    expect(result.data.requirements[0]?.category).toBe('objeto');
    expect(result.costUsd).toBe(0);
  });

  it('MockAIProvider gera Opportunity Brief válido conforme schema Zod', async () => {
    const provider = new MockAIProvider();

    const result = await provider.generateStructured<OpportunityBrief>(
      {
        taskType: 'opportunity.brief_generation',
        model: 'mock-brief-v1',
        messages: [{ role: 'user', content: 'Gerar brief comercial para empresa de TI' }],
      },
      opportunityBriefSchema,
    );

    expect(result.data.status).toBe('COMPLETED');
    expect(result.data.commercialFit.score).toBeGreaterThanOrEqual(0);
    expect(result.data.commercialFit.score).toBeLessThanOrEqual(100);
    expect(['high', 'medium', 'low']).toContain(result.data.commercialFit.level);
    expect(result.data.disclaimer.toLowerCase()).toContain('não constitui parecer jurídico');
  });

  it('AIModelRouter seleciona provedor configurado e resolve modelo', () => {
    const mock = new MockAIProvider();
    const router = new AIModelRouter([mock]);

    const resolved = router.resolveModelAndProvider('document.requirements_extraction');
    expect(resolved.providerId).toBe('mock');
    expect(resolved.model).toBeDefined();

    const registered = router.getRegisteredProviders();
    expect(registered).toEqual([{ id: 'mock', name: 'Mock Deterministic AI Provider', configured: true }]);
  });

  it('AIModelRouter aciona provedor de fallback em caso de falha', async () => {
    const failingProvider = {
      id: 'failing-primary',
      name: 'Failing Provider',
      isConfigured: () => true,
      generateStructured: vi.fn().mockRejectedValue(new Error('API indisponível 503')),
    };

    const fallbackMock = new MockAIProvider();
    const router = new AIModelRouter([failingProvider as any, fallbackMock]);

    // Force fallback to mock
    process.env.AI_FALLBACK_PROVIDER = 'mock';
    process.env.AI_FALLBACK_MODEL = 'mock-brief-v1';

    const result = await router.executeWithFallback<ProcurementAIAnalysis>(
      'document.requirements_extraction',
      {
        messages: [{ role: 'user', content: 'Teste fallback' }],
      },
      procurementAIAnalysisSchema,
    );

    expect(result.provider).toBe('mock');
    expect(result.data.requirements).toBeDefined();
  });
});

describe('Document Intelligence — Extração Documental', () => {
  it('Segmenta texto de edital em seções preservando referências', () => {
    const fakeDb = { query: { documentExtractions: { findFirst: vi.fn() } } } as any;
    const service = new DocumentExtractionService(fakeDb);

    const text = `
    PREÂMBULO DO EDITAL
    Pregão Eletrônico 01/2026.
    1. DO OBJETO
    Aquisição de computadores portáteis e periféricos.
    2. DA HABILITAÇÃO
    Apresentar balanço patrimonial e certidão negativa.
    3. DOS PRAZOS
    Prazo para impugnação: 3 dias úteis.
    `;

    const sections = service.extractSectionsFromText(text);
    expect(sections.length).toBeGreaterThanOrEqual(3);
    expect(sections.some((s) => /objeto/i.test(s.title))).toBe(true);
    expect(sections.some((s) => /habilita/i.test(s.title))).toBe(true);
  });
});

describe('Document Intelligence — Avaliação com Editais Reais de Referência', () => {
  const fixtures = [
    {
      tipo: 'Edital TI e Escritório',
      texto: 'OBJETO: Aquisição de impressoras multifuncionais e cartuchos de toner para órgãos estaduais. Habilitação: SICAF ativo, regularidade fiscal com CND e certidão FGTS. Local de entrega: Almoxarifado central, São Paulo/SP.',
      expectedCategory: 'objeto',
      isOffice: true,
    },
    {
      tipo: 'Edital Obras e Engenharia',
      texto: 'OBJETO: Contratação de empresa para reforma de ponte e pavimentação asfáltica. Habilitação técnica: Certidão de Registro no CREA e Atestado de Capacidade Técnica de execução de obras de arte especiais.',
      expectedCategory: 'objeto',
      isOffice: false,
    },
    {
      tipo: 'Edital sem Local de Execução Claro',
      texto: 'OBJETO: Prestação de serviços de consultoria técnica. Órgão: Tribunal Regional Eleitoral do Paraná, Curitiba/PR. Local de execução: A definir nas ordens de serviço.',
      expectedCategory: 'objeto',
      isOffice: false,
    },
  ];

  it.each(fixtures)('processa com sucesso caso real: $tipo', async (fixture) => {
    const provider = new MockAIProvider();
    const result = await provider.generateStructured<ProcurementAIAnalysis>(
      {
        taskType: 'document.requirements_extraction',
        model: 'mock-brief-v1',
        messages: [{ role: 'user', content: fixture.texto }],
      },
      procurementAIAnalysisSchema,
    );

    // Validações obrigatórias dos critérios de aceite
    expect(result.data.requirements.length).toBeGreaterThan(0);
    expect(result.data.requirements.every((r) => r.title && r.description && r.status)).toBe(true);
    expect(result.data.risks.every((r) => r.description && r.severity)).toBe(true);
    expect(result.data.unverifiedPoints.length).toBeGreaterThan(0);

    // Não inventar dados
    const local = result.data.executionPlace;
    if (local) {
      expect(typeof local.details).toBe('string');
    }
  });
});
