import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Inject,
  Injectable,
  Module,
  UseGuards,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  BadRequestException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { eq, and, isNull, isNotNull, desc, sql, asc } from 'drizzle-orm';
import {
  collectionRuns,
  dataSources,
  outboxEvents,
  procurements,
  opportunityMatches,
  alerts,
  procurementAIAnalyses,
  opportunityBriefs,
  commercialProfiles,
} from '@radar/database';
import { queues, type DomainEvent } from '@radar/events';
import { environment, logger } from '@radar/config';
import { tenderRequirementsExtractionSchema, type TenantContext } from '@radar/contracts';
import { DatabaseService } from '../../common/database.module.js';
import { RedisService, RedisModule } from '../../common/redis.module.js';
import { Tenant } from '../../common/http.js';
import { TenancyModule, TenantGuard } from '../tenancy/tenancy.module.js';
import { OrganizationsModule } from '../organizations/organizations.module.js';
import {
  DocumentIntelligenceModule,
  DocumentIntelligenceService,
} from '../document-intelligence/document-intelligence.module.js';
import { CompanyRegistryService } from '../organizations/company-registry/company-registry.service.js';
import type { MockFailureMode } from '@radar/document-intelligence';

@Injectable()
export class DebugGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    const env = environment();
    if (!env.DEBUG_MODE) {
      throw new NotFoundException('Modo de depuração desativado no ambiente.');
    }
    return true;
  }
}

@Injectable()
export class DebugService {
  private collectionQueue: Queue;
  private matchingQueue: Queue;

  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(DocumentIntelligenceService)
    private readonly intelligenceService: DocumentIntelligenceService,
    @Inject(CompanyRegistryService)
    @Optional() private readonly registryService?: CompanyRegistryService,
  ) {
    const redisConn = this.redis.client.duplicate();
    this.collectionQueue = new Queue(queues.collection, { connection: redisConn });
    this.matchingQueue = new Queue(queues.matching, { connection: redisConn });
  }

  async getStatus(organizationId?: string) {
    const env = environment();
    const collectionOverride = typeof (this.redis as RedisService & { get?: (key: string) => Promise<string | null> }).get === 'function'
      ? await (this.redis as RedisService & { get: (key: string) => Promise<string | null> }).get('debug:collection:enabled')
      : null;
    const [collectionQueueCounts, matchingQueueCounts] = await Promise.all([
      typeof this.collectionQueue.getJobCounts === 'function'
        ? this.collectionQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')
        : Promise.resolve({}),
      typeof this.matchingQueue.getJobCounts === 'function'
        ? this.matchingQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')
        : Promise.resolve({}),
    ]);

    // 1. Collector status
    const [lastRun] = await this.database.db
      .select()
      .from(collectionRuns)
      .orderBy(desc(collectionRuns.startedAt))
      .limit(1);

    const source = await this.database.db.query.dataSources.findFirst({
      where: eq(dataSources.id, 'pncp'),
    });

    const [procCount] = await this.database.db
      .select({ count: sql<number>`count(*)::int` })
      .from(procurements);

    // 2. Outbox status
    const [pendingOutbox] = await this.database.db
      .select({ count: sql<number>`count(*)::int` })
      .from(outboxEvents)
      .where(isNull(outboxEvents.dispatchedAt));

    const [dispatchedOutbox] = await this.database.db
      .select({ count: sql<number>`count(*)::int` })
      .from(outboxEvents)
      .where(isNotNull(outboxEvents.dispatchedAt));

    const recentEvents = await this.database.db
      .select()
      .from(outboxEvents)
      .orderBy(desc(outboxEvents.createdAt))
      .limit(6);

    // 3. Matching status
    const [totalMatches] = await this.database.db
      .select({ count: sql<number>`count(*)::int` })
      .from(opportunityMatches);

    let orgMatches = 0;
    let orgAlerts = 0;
    if (organizationId) {
      const [m] = await this.database.db
        .select({ count: sql<number>`count(*)::int` })
        .from(opportunityMatches)
        .where(eq(opportunityMatches.organizationId, organizationId));
      orgMatches = m?.count || 0;

      const [a] = await this.database.db
        .select({ count: sql<number>`count(*)::int` })
        .from(alerts)
        .where(eq(alerts.organizationId, organizationId));
      orgAlerts = a?.count || 0;
    }

    // 4. AI & Documents status
    const [totalAnalyses] = await this.database.db
      .select({ count: sql<number>`count(*)::int` })
      .from(procurementAIAnalyses);

    const [totalBriefs] = await this.database.db
      .select({ count: sql<number>`count(*)::int` })
      .from(opportunityBriefs);

    const usageSummary = await this.intelligenceService.usageTracker.getUsageSummary();

    // 5. Registry / Redis status
    const cnpjWsRate = await this.redis.checkRateLimit('ratelimit:cnpjws:public', 60, 3);

    return {
      debugMode: env.DEBUG_MODE,
      collector: {
        enabled: collectionOverride == null ? env.COLLECTION_ENABLED : collectionOverride === 'true',
        configuredEnabled: env.COLLECTION_ENABLED,
        intervalMs: env.COLLECTION_INTERVAL_MS,
        lastRun: lastRun || null,
        cursor: source?.cursor ? source.cursor.toISOString() : null,
        totalProcurements: procCount?.count || 0,
      },
      outbox: {
        pendingCount: pendingOutbox?.count || 0,
        dispatchedCount: dispatchedOutbox?.count || 0,
        recentEvents,
      },
      queues: {
        collection: collectionQueueCounts,
        matching: matchingQueueCounts,
      },
      matching: {
        totalMatches: totalMatches?.count || 0,
        orgMatches,
        orgAlerts,
      },
      ai: {
        enabled: env.AI_ENABLED,
        provider: env.AI_DEFAULT_PROVIDER,
        model: env.AI_DEFAULT_MODEL,
        totalAnalyses: totalAnalyses?.count || 0,
        totalBriefs: totalBriefs?.count || 0,
        usageSummary,
      },
      registry: {
        cnpjWsRateLimitRemaining: cnpjWsRate.remaining,
      },
    };
  }

  async triggerCollector() {
    const job = await this.collectionQueue.add('pncp-debug', {}, { removeOnComplete: 100 });
    logger.info({ jobId: job.id }, 'Job de coleta PNCP enfileirado manualmente via Debug');
    return {
      success: true,
      jobId: job.id,
      message: 'Job de coleta PNCP enfileirado com sucesso na fila BullMQ radar-collection.',
    };
  }

  async setCollectionEnabled(enabled: boolean) {
    await this.redis.set('debug:collection:enabled', String(enabled));
    if (enabled) {
      await this.collectionQueue.upsertJobScheduler(
        'pncp-hourly',
        { every: environment().COLLECTION_INTERVAL_MS },
        {
          name: 'pncp',
          data: {},
          opts: { attempts: 3, removeOnComplete: 100, removeOnFail: 100 },
        },
      );
    } else {
      await this.collectionQueue.removeJobScheduler('pncp-hourly');
    }
    return {
      success: true,
      enabled,
      message: `Coleta automática ${enabled ? 'ativada' : 'desativada'}; a coleta manual permanece disponível.`,
    };
  }

  async resetCollectorCursor(days = 2) {
    const newCursor = new Date(Date.now() - days * 86400000);
    await this.database.db
      .update(dataSources)
      .set({ cursor: newCursor })
      .where(eq(dataSources.id, 'pncp'));

    logger.info({ newCursor }, 'Cursor do coletor PNCP resetado via Debug');
    return {
      success: true,
      newCursor: newCursor.toISOString(),
      message: `Cursor de data do PNCP redefinido com sucesso para ${days} dias atrás.`,
    };
  }

  async drainOutbox() {
    const events = await this.database.db
      .select()
      .from(outboxEvents)
      .where(isNull(outboxEvents.dispatchedAt))
      .orderBy(asc(outboxEvents.createdAt))
      .limit(100);

    let dispatchedCount = 0;
    for (const event of events) {
      await this.matchingQueue.add(event.type, event.payload, {
        jobId: event.id,
        attempts: 3,
        removeOnComplete: 100,
      });
      await this.database.db
        .update(outboxEvents)
        .set({ dispatchedAt: new Date() })
        .where(eq(outboxEvents.id, event.id));
      dispatchedCount++;
    }

    logger.info({ dispatchedCount }, 'Outbox despachada manualmente via Debug');
    return {
      success: true,
      dispatchedCount,
      message: `${dispatchedCount} evento(s) pendente(s) despachado(s) com sucesso para a fila BullMQ.`,
    };
  }

  async retryFailedJobs(queueName: 'collection' | 'matching') {
    const queue = queueName === 'collection' ? this.collectionQueue : this.matchingQueue;
    const jobs = await queue.getFailed(0, 100);
    for (const job of jobs) await job.retry('failed');
    return { success: true, queue: queueName, retriedCount: jobs.length };
  }

  async clearFailedJobs(queueName: 'collection' | 'matching') {
    const queue = queueName === 'collection' ? this.collectionQueue : this.matchingQueue;
    const removed = await queue.clean(0, 1000, 'failed');
    return { success: true, queue: queueName, removedCount: removed.length };
  }

  async reindexMatching(organizationId: string) {
    const [event] = await this.database.db
      .insert(outboxEvents)
      .values({
        type: 'profile.changed',
        payload: { type: 'profile.changed', organizationId },
      })
      .returning();

    if (event) {
      await this.matchingQueue.add(event.type, event.payload, {
        jobId: event.id,
        attempts: 3,
        removeOnComplete: 100,
      });
      await this.database.db
        .update(outboxEvents)
        .set({ dispatchedAt: new Date() })
        .where(eq(outboxEvents.id, event.id));
    }

    logger.info({ organizationId }, 'Re-matching enfileirado via Debug');
    return {
      success: true,
      message: 'Recálculo de matching enfileirado para todas as licitações abertas da sua empresa.',
    };
  }

  async reindexProcurement(procurementId: string) {
    const procurement = await this.database.db.query.procurements.findFirst({ where: eq(procurements.id, procurementId) });
    if (!procurement) throw new NotFoundException('Licitação não encontrada.');
    const job = await this.matchingQueue.add(
      'procurement.changed',
      { type: 'procurement.changed', procurementId },
      { attempts: 3, removeOnComplete: 100 },
    );
    return { success: true, jobId: job.id, message: 'Matching do edital enfileirado para reprocessamento.' };
  }

  async analyzeProcurement(procurementId: string) {
    const procurement = await this.database.db.query.procurements.findFirst({ where: eq(procurements.id, procurementId) });
    if (!procurement) throw new NotFoundException('Licitação não encontrada.');
    const job = await this.matchingQueue.add(
      'procurement.ai.analyze',
      { type: 'procurement.ai.analyze', procurementId, version: procurement.version },
      { attempts: 3, removeOnComplete: 100 },
    );
    return { success: true, jobId: job.id, message: 'Análise documental enfileirada para a versão atual do edital.' };
  }

  async regenerateBrief(organizationId: string, procurementId: string, profileId?: string) {
    const profile = await this.database.db.query.commercialProfiles.findFirst({
      where: profileId
        ? and(eq(commercialProfiles.id, profileId), eq(commercialProfiles.organizationId, organizationId))
        : eq(commercialProfiles.organizationId, organizationId),
    });
    if (!profile) throw new NotFoundException('Perfil comercial não encontrado para a organização ativa.');
    const procurement = await this.database.db.query.procurements.findFirst({ where: eq(procurements.id, procurementId) });
    if (!procurement) throw new NotFoundException('Licitação não encontrada.');
    const job = await this.matchingQueue.add(
      'opportunity.brief.generate',
      { type: 'opportunity.brief.generate', organizationId, profileId: profile.id, procurementId },
      { attempts: 3, removeOnComplete: 100 },
    );
    return { success: true, jobId: job.id, profileId: profile.id, message: 'Opportunity Brief enfileirado para regeneração.' };
  }

  async getBriefJson(organizationId: string, procurementId: string) {
    const brief = await this.database.db.query.opportunityBriefs.findFirst({
      where: eq(opportunityBriefs.procurementId, procurementId),
    });
    if (!brief || brief.organizationId !== organizationId) {
      throw new NotFoundException('Brief não encontrado para a organização ativa.');
    }
    return brief;
  }

  async runAiSmokeTest() {
    const prompt = {
      messages: [
        {
          role: 'system' as const,
          content:
            'Você é um auditor de licitações públicas brasileiras (Lei 14.133/2021). Extraia requisitos e os 5 blocos em JSON estrito.',
        },
        {
          role: 'user' as const,
          content:
            'Pregão Eletrônico 10/2026: Contratação de serviços de suporte de TI e manutenção de computadores para a Prefeitura Municipal de São Paulo/SP. Habilitação: SICAF ativo, CND Federal e atestado de capacidade técnica. Prazo de impugnação de 3 dias úteis.',
        },
      ],
      schemaName: 'TenderRequirementsExtraction',
    };

    const target = this.intelligenceService.router.resolveModelAndProvider(
      'document.requirements_extraction',
    );

    const start = Date.now();
    const result = await this.intelligenceService.router.executeWithFallback(
      'document.requirements_extraction',
      prompt,
      tenderRequirementsExtractionSchema,
    );
    const latencyMs = Date.now() - start;

    return {
      success: true,
      provider: result.provider,
      model: result.model,
      latencyMs,
      tokens: {
        input: result.inputTokens,
        output: result.outputTokens,
        total: result.totalTokens,
      },
      costUsd: result.costUsd,
      data: result.data,
    };
  }

  setMockFailureMode(mode: MockFailureMode) {
    this.intelligenceService.setMockFailureMode(mode);
    return { success: true, failureMode: mode, message: `Falha simulada do Mock definida como '${mode}'.` };
  }

  async lookupCnpj(cnpj: string, source?: 'brasilapi' | 'cnpjws' | 'mock') {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) throw new BadRequestException('Informe um CNPJ com 14 dígitos.');
    if (!this.registryService) throw new ServiceUnavailableException('Serviço cadastral indisponível.');
    return this.registryService.getRegistryByCnpj(cleanCnpj, { preferredSource: source });
  }

  async clearCnpjCache() {
    const keys = await this.redis.client.keys('company_registry:*');
    if (keys.length > 0) {
      await this.redis.client.del(...keys);
    }
    await this.redis.client.del('ratelimit:cnpjws:public');

    logger.info({ totalKeys: keys.length }, 'Cache de CNPJs limpo no Redis via Debug');
    return {
      success: true,
      clearedKeys: keys.length,
      message: `${keys.length} chave(s) de cache de CNPJ e rate limit removidas do Redis.`,
    };
  }

  async clearAiCache(procurementId?: string) {
    if (procurementId) {
      await this.database.db
        .delete(procurementAIAnalyses)
        .where(eq(procurementAIAnalyses.procurementId, procurementId));
      await this.database.db
        .delete(opportunityBriefs)
        .where(eq(opportunityBriefs.procurementId, procurementId));
      return {
        success: true,
        message: `Análise de IA e briefs da licitação ${procurementId} purgados do banco.`,
      };
    }

    await this.database.db.delete(opportunityBriefs);
    await this.database.db.delete(procurementAIAnalyses);
    return {
      success: true,
      message: 'Todas as análises e briefs de IA foram purgados do banco com sucesso.',
    };
  }

  async simulateAlert(organizationId: string) {
    const sample = await this.database.db.query.procurements.findFirst();
    if (!sample) {
      throw new NotFoundException('Nenhuma licitação disponível no banco para vincular ao alerta.');
    }

    const [alert] = await this.database.db
      .insert(alerts)
      .values({
        organizationId,
        procurementId: sample.id,
        eventKey: `debug:manual-alert:${Date.now()}`,
        message: `[DEBUG] Notificação simulada manualmente para validação do painel (${new Date().toLocaleTimeString('pt-BR')}).`,
      })
      .returning();

    return {
      success: true,
      alertId: alert?.id,
      message: 'Alerta simulado gerado com sucesso na caixa de entrada da organização ativa.',
    };
  }
}

@UseGuards(DebugGuard, TenantGuard)
@Controller('debug')
export class DebugController {
  constructor(@Inject(DebugService) private readonly service: DebugService) {}

  @Get('status')
  getStatus(@Tenant() tenant: TenantContext) {
    return this.service.getStatus(tenant.organizationId);
  }

  @Post('collector/trigger')
  triggerCollector() {
    return this.service.triggerCollector();
  }

  @Post('collector/toggle')
  toggleCollector(@Body('enabled') enabled: boolean) {
    if (typeof enabled !== 'boolean') throw new BadRequestException('O campo enabled deve ser booleano.');
    return this.service.setCollectionEnabled(enabled);
  }

  @Post('collector/reset-cursor')
  resetCursor(@Body('days') days?: number) {
    return this.service.resetCollectorCursor(days || 2);
  }

  @Post('outbox/drain')
  drainOutbox() {
    return this.service.drainOutbox();
  }

  @Post('queues/retry-failed')
  retryFailed(@Body('queue') queue: 'collection' | 'matching') {
    if (!['collection', 'matching'].includes(queue)) throw new BadRequestException('Fila inválida.');
    return this.service.retryFailedJobs(queue);
  }

  @Post('queues/clear-failed')
  clearFailed(@Body('queue') queue: 'collection' | 'matching') {
    if (!['collection', 'matching'].includes(queue)) throw new BadRequestException('Fila inválida.');
    return this.service.clearFailedJobs(queue);
  }

  @Post('matching/reindex')
  reindexMatching(@Tenant() tenant: TenantContext) {
    return this.service.reindexMatching(tenant.organizationId);
  }

  @Post('matching/reindex-procurement')
  reindexProcurement(@Body('procurementId') procurementId: string) {
    return this.service.reindexProcurement(procurementId);
  }

  @Post('ai/smoke')
  runAiSmoke() {
    return this.service.runAiSmokeTest();
  }

  @Post('ai/analyze')
  analyzeProcurement(@Body('procurementId') procurementId: string) {
    return this.service.analyzeProcurement(procurementId);
  }

  @Post('ai/mock-failure')
  setMockFailure(@Body('mode') mode: MockFailureMode) {
    return this.service.setMockFailureMode(mode);
  }

  @Post('ai/brief/regenerate')
  regenerateBrief(
    @Tenant() tenant: TenantContext,
    @Body('procurementId') procurementId: string,
    @Body('profileId') profileId?: string,
  ) {
    return this.service.regenerateBrief(tenant.organizationId, procurementId, profileId);
  }

  @Get('ai/brief')
  getBriefJson(@Tenant() tenant: TenantContext, @Query('procurementId') procurementId?: string) {
    if (!procurementId) throw new BadRequestException('Informe procurementId.');
    return this.service.getBriefJson(tenant.organizationId, procurementId);
  }

  @Post('cache/clear-cnpj')
  clearCnpjCache() {
    return this.service.clearCnpjCache();
  }

  @Post('registry/lookup')
  lookupCnpj(@Body('cnpj') cnpj: string, @Body('source') source?: 'brasilapi' | 'cnpjws' | 'mock') {
    return this.service.lookupCnpj(cnpj, source);
  }

  @Post('cache/clear-ai')
  clearAiCache(@Query('procurementId') procurementId?: string) {
    return this.service.clearAiCache(procurementId);
  }

  @Post('alerts/simulate')
  simulateAlert(@Tenant() tenant: TenantContext) {
    return this.service.simulateAlert(tenant.organizationId);
  }
}

@Module({
  imports: [TenancyModule, OrganizationsModule, DocumentIntelligenceModule, RedisModule],
  controllers: [DebugController],
  providers: [DebugService, DebugGuard],
  exports: [DebugService, DebugGuard],
})
export class DebugModule {}
