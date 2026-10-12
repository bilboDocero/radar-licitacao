import {
  Controller,
  Get,
  Param,
  Inject,
  Injectable,
  Module,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { procurements, commercialProfiles } from '@radar/database';
import { type TenantContext } from '@radar/contracts';
import { environment } from '@radar/config';
import {
  MockAIProvider,
  OpenAIProvider,
  GeminiProvider,
  AIModelRouter,
  AIUsageTracker,
  DocumentExtractionService,
  ProcurementAnalyzer,
  OpportunityBriefService,
} from '@radar/document-intelligence';
import { DatabaseService } from '../../common/database.module.js';
import { Tenant, PlatformAdmin } from '../../common/http.js';
import { TenancyModule, TenantGuard } from '../tenancy/tenancy.module.js';

@Injectable()
export class DocumentIntelligenceService {
  readonly router: AIModelRouter;
  readonly usageTracker: AIUsageTracker;
  readonly extractionService: DocumentExtractionService;
  readonly analyzer: ProcurementAnalyzer;
  readonly briefService: OpportunityBriefService;

  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {
    const env = environment();
    this.usageTracker = new AIUsageTracker(this.database.db);

    const providers = [
      new MockAIProvider(),
      new OpenAIProvider(env.OPENAI_API_KEY),
      new GeminiProvider(env.GEMINI_API_KEY),
    ];

    this.router = new AIModelRouter(providers, this.usageTracker);
    this.extractionService = new DocumentExtractionService(this.database.db);
    this.analyzer = new ProcurementAnalyzer(this.database.db, this.router, this.extractionService);
    this.briefService = new OpportunityBriefService(this.database.db, this.analyzer);
  }

  async getProcurementAnalysis(procurementId: string) {
    const procurement = await this.database.db.query.procurements.findFirst({
      where: eq(procurements.id, procurementId),
    });
    if (!procurement) {
      throw new NotFoundException('Licitação não encontrada');
    }

    return this.analyzer.analyze(procurementId, procurement.version);
  }

  async getOpportunityBrief(organizationId: string, procurementId: string) {
    const brief = await this.briefService.getBrief(organizationId, procurementId);
    if (brief) return brief;

    // Look for active commercial profile
    const profile = await this.database.db.query.commercialProfiles.findFirst({
      where: eq(commercialProfiles.organizationId, organizationId),
    });

    if (!profile) {
      return null;
    }

    return this.briefService.generateBrief({
      organizationId,
      profileId: profile.id,
      procurementId,
    });
  }
}

@Controller()
export class DocumentIntelligenceController {
  constructor(
    @Inject(DocumentIntelligenceService)
    private readonly service: DocumentIntelligenceService,
  ) {}

  @UseGuards(TenantGuard)
  @Get('procurements/:id/analysis')
  getAnalysis(@Param('id') id: string) {
    return this.service.getProcurementAnalysis(id);
  }

  @UseGuards(TenantGuard)
  @Get('procurements/:id/brief')
  getBrief(@Tenant() tenant: TenantContext, @Param('id') id: string) {
    return this.service.getOpportunityBrief(tenant.organizationId, id);
  }

  @PlatformAdmin()
  @Get('admin/ai/overview')
  async getAdminOverview() {
    const summary = await this.service.usageTracker.getUsageSummary();
    const recent = await this.service.usageTracker.getRecentUsage(20);
    const providers = this.service.router.getRegisteredProviders();

    return {
      summary,
      providers,
      recentCalls: recent,
    };
  }
}

@Module({
  imports: [TenancyModule],
  controllers: [DocumentIntelligenceController],
  providers: [DocumentIntelligenceService],
  exports: [DocumentIntelligenceService],
})
export class DocumentIntelligenceModule {}
