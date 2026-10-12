import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DebugGuard,
  DebugService,
} from '../../apps/api/src/modules/debug/debug.module.js';
import { NotFoundException } from '@nestjs/common';

describe('Painel de Debug e Controle de Background', () => {
  describe('DebugGuard', () => {
    it('lança NotFoundException quando DEBUG_MODE for falso', () => {
      const guard = new DebugGuard();
      process.env.DEBUG_MODE = 'false';

      expect(() => guard.canActivate({} as any)).toThrow(NotFoundException);
    });

    it('permite acesso quando DEBUG_MODE for verdadeiro', () => {
      const guard = new DebugGuard();
      process.env.DEBUG_MODE = 'true';

      expect(guard.canActivate({} as any)).toBe(true);
    });
  });

  describe('DebugService', () => {
    let fakeDb: any;
    let fakeRedis: any;
    let fakeIntelligence: any;

    beforeEach(() => {
      process.env.DEBUG_MODE = 'true';
      fakeDb = {
        query: {
          dataSources: {
            findFirst: vi.fn().mockResolvedValue({ id: 'pncp', cursor: new Date('2026-10-10') }),
          },
          procurements: {
            findFirst: vi.fn().mockResolvedValue({ id: 'proc-123' }),
          },
        },
        select: vi.fn().mockImplementation(() => {
          const queryObj: any = {
            from: vi.fn().mockImplementation(() => {
              const fromObj: any = {
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ id: 'run-1', status: 'completed', records: 10, startedAt: new Date() }]),
                }),
                where: vi.fn().mockImplementation(() => {
                  const whereObj: any = {
                    orderBy: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue([]),
                    }),
                    limit: vi.fn().mockResolvedValue([{ count: 5 }]),
                    then: (resolve: any) => Promise.resolve([{ count: 5 }]).then(resolve),
                  };
                  return whereObj;
                }),
                then: (resolve: any) => Promise.resolve([{ count: 5 }]).then(resolve),
              };
              return fromObj;
            }),
          };
          return queryObj;
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'event-1' }]),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      };

      fakeRedis = {
        client: {
          duplicate: vi.fn().mockReturnValue({
            on: vi.fn(),
            add: vi.fn().mockResolvedValue({ id: 'job-123' }),
          }),
          keys: vi.fn().mockResolvedValue(['company_registry:00000000000191']),
          del: vi.fn().mockResolvedValue(1),
        },
        checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 3 }),
      };

      fakeIntelligence = {
        usageTracker: {
          getUsageSummary: vi.fn().mockResolvedValue({
            totalCalls: 10,
            successfulCalls: 10,
            failedCalls: 0,
            totalTokens: 5000,
            totalCostUsd: '0.0012',
            avgLatencyMs: 800,
          }),
        },
        router: {
          resolveModelAndProvider: vi.fn().mockReturnValue({ providerId: 'mock', model: 'mock-brief-v1' }),
          executeWithFallback: vi.fn().mockResolvedValue({
            provider: 'mock',
            model: 'mock-brief-v1',
            inputTokens: 100,
            outputTokens: 200,
            totalTokens: 300,
            costUsd: 0,
            data: { summary: 'Teste de inferência', requirements: [] },
          }),
        },
      };
    });

    it('retorna status estruturado de todos os subsistemas em segundo plano', async () => {
      const service = new DebugService({ db: fakeDb } as any, fakeRedis, fakeIntelligence);
      const status = await service.getStatus('org-123');

      expect(status.debugMode).toBe(true);
      expect(status.collector).toBeDefined();
      expect(status.outbox).toBeDefined();
      expect(status.matching).toBeDefined();
      expect(status.ai).toBeDefined();
      expect(status.registry).toBeDefined();
      expect(status.ai.usageSummary.totalCalls).toBe(10);
    });

    it('permite resetar o cursor do PNCP para 2 dias atrás', async () => {
      const service = new DebugService({ db: fakeDb } as any, fakeRedis, fakeIntelligence);
      const res = await service.resetCollectorCursor(2);

      expect(res.success).toBe(true);
      expect(res.newCursor).toBeDefined();
      expect(fakeDb.update).toHaveBeenCalled();
    });

    it('limpa chaves de cache de CNPJ no Redis', async () => {
      const service = new DebugService({ db: fakeDb } as any, fakeRedis, fakeIntelligence);
      const res = await service.clearCnpjCache();

      expect(res.success).toBe(true);
      expect(res.clearedKeys).toBe(1);
      expect(fakeRedis.client.del).toHaveBeenCalled();
    });

    it('executa smoke test da IA e reporta latência e tokens', async () => {
      const service = new DebugService({ db: fakeDb } as any, fakeRedis, fakeIntelligence);
      const res = await service.runAiSmokeTest();

      expect(res.success).toBe(true);
      expect(res.provider).toBe('mock');
      expect(res.tokens.total).toBe(300);
      expect(res.data.summary).toBe('Teste de inferência');
    });

    it('simula alerta na caixa postal da organização ativa', async () => {
      const service = new DebugService({ db: fakeDb } as any, fakeRedis, fakeIntelligence);
      const res = await service.simulateAlert('org-123');

      expect(res.success).toBe(true);
      expect(res.alertId).toBe('event-1');
      expect(fakeDb.insert).toHaveBeenCalled();
    });
  });
});
