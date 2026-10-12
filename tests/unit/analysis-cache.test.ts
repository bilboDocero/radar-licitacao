import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../../packages/database/src/index.js';
import type { OpportunityBrief } from '../../packages/contracts/src/index.js';
import {
  AIModelRouter,
  DocumentExtractionService,
  OpportunityBriefService,
  ProcurementAnalyzer,
} from '../../packages/document-intelligence/src/index.js';

const id = '00000000-0000-4000-8000-000000000001';
const saved = {
  procurementId: id,
  version: 1,
  status: 'COMPLETED',
  provider: 'mock',
  model: 'mock-brief-v1',
  promptVersion: '1.0.0',
  summary: 'Resumo antigo',
  executionPlace: null,
  requirements: [],
  risks: [],
  unverifiedPoints: [],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
};

function fixture(providerId = 'gemini', model = 'test-model') {
  const execute = vi.fn().mockResolvedValue({
    provider: providerId,
    model,
    totalTokens: 10,
    costUsd: 0,
    data: {
      summary: 'Resumo regenerado',
      executionPlace: null,
      requirements: [],
      risks: [],
      unverifiedPoints: [],
    },
  });
  const upsert = vi.fn().mockResolvedValue(undefined);
  const db = {
    query: {
      procurements: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ id, version: 1, agency: 'TEST', title: 'TEST', deadline: null }),
      },
      procurementAIAnalyses: { findFirst: vi.fn().mockResolvedValue(saved) },
    },
    insert: vi
      .fn()
      .mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoUpdate: upsert }) }),
  } as unknown as Database;
  const router = {
    resolveModelAndProvider: () => ({ providerId, model }),
    executeWithFallback: execute,
  } as unknown as AIModelRouter;
  const extraction = {
    extractAndStore: vi
      .fn()
      .mockResolvedValue({ extractedText: 'TEST', sections: [], pageCount: 1 }),
  } as unknown as DocumentExtractionService;
  return { analyzer: new ProcurementAnalyzer(db, router, extraction), execute, upsert };
}

describe('Cache de análise ao ativar provedor real', () => {
  it('substitui análise mock quando o provedor configurado muda', async () => {
    const { analyzer, execute, upsert } = fixture();
    const result = await analyzer.analyze(id);
    expect(result.provider).toBe('gemini');
    expect(result.summary).toBe('Resumo regenerado');
    expect(execute).toHaveBeenCalledOnce();
    expect(upsert).toHaveBeenCalledOnce();
  });

  it('reaproveita mesma configuração sem nova chamada e retorna data de atualização', async () => {
    const { analyzer, execute } = fixture('mock', 'mock-brief-v1');
    const result = await analyzer.analyze(id);
    expect(result.analyzedAt).toBe(saved.updatedAt.toISOString());
    expect(execute).not.toHaveBeenCalled();
  });

  it('reanálise explícita executa novamente mesmo com cache válido', async () => {
    const { analyzer, execute } = fixture('mock', 'mock-brief-v1');
    await analyzer.analyze(id, undefined, true);
    expect(execute).toHaveBeenCalledOnce();
  });

  it('mudança de modelo também invalida a análise', async () => {
    const { analyzer, execute } = fixture('mock', 'different-model');
    await analyzer.analyze(id);
    expect(execute).toHaveBeenCalledOnce();
  });

  it('atualiza brief antigo preservando empresa e perfil selecionados', async () => {
    const db = {
      query: {
        opportunityBriefs: {
          findFirst: vi.fn().mockResolvedValue({
            organizationId: 'org',
            profileId: 'profile',
            procurementId: id,
            updatedAt: new Date('2026-01-01'),
          }),
        },
      },
    } as unknown as Database;
    const analyzer = {
      analyze: vi.fn().mockResolvedValue({ analyzedAt: '2026-01-02T00:00:00.000Z' }),
    } as unknown as ProcurementAnalyzer;
    const service = new OpportunityBriefService(db, analyzer);
    const fresh = { summary: 'Novo brief' } as OpportunityBrief;
    const regenerate = vi.spyOn(service, 'generateBrief').mockResolvedValue(fresh);
    expect(await service.getBrief('org', id)).toBe(fresh);
    expect(regenerate).toHaveBeenCalledWith({
      organizationId: 'org',
      profileId: 'profile',
      procurementId: id,
    });
  });
});
