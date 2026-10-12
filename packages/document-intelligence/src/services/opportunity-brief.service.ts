import { and, eq } from 'drizzle-orm';
import {
  procurements,
  commercialProfiles,
  opportunityBriefs,
  procurementAIAnalyses,
  type Database,
} from '@radar/database';
import { opportunityBriefSchema, type OpportunityBrief } from '@radar/contracts';
import { ProcurementAnalyzer } from './procurement-analyzer.service.js';
import { logger } from '@radar/config';

export class OpportunityBriefService {
  constructor(
    private readonly db: Database,
    private readonly analyzer: ProcurementAnalyzer,
  ) {}

  async generateBrief(params: {
    organizationId: string;
    profileId: string;
    procurementId: string;
  }): Promise<OpportunityBrief> {
    const { organizationId, profileId, procurementId } = params;

    const [procurement, profile] = await Promise.all([
      this.db.query.procurements.findFirst({ where: eq(procurements.id, procurementId) }),
      this.db.query.commercialProfiles.findFirst({
        where: and(
          eq(commercialProfiles.id, profileId),
          eq(commercialProfiles.organizationId, organizationId),
        ),
      }),
    ]);

    if (!procurement) {
      throw new Error(`Licitação ${procurementId} não encontrada`);
    }
    if (!profile) {
      throw new Error(`Perfil comercial ${profileId} não encontrado para esta organização`);
    }

    // Ensure edital AI analysis exists (or execute shared analysis now)
    await this.analyzer.analyze(procurementId, procurement.version);
    const analysis = await this.db.query.procurementAIAnalyses.findFirst({
      where: and(
        eq(procurementAIAnalyses.procurementId, procurementId),
        eq(procurementAIAnalyses.version, procurement.version),
      ),
    });

    // Determine geographic compatibility
    const basis = profile.coverage.national
      ? 'national'
      : procurement.executionMunicipality || procurement.executionState
        ? 'execution'
        : 'agency';

    const uf = basis === 'execution' ? procurement.executionState : procurement.agencyState;
    const municipality =
      basis === 'execution' ? procurement.executionMunicipality : procurement.agencyMunicipality;

    const geoCompatible =
      profile.coverage.national ||
      profile.coverage.states.includes(uf as (typeof profile.coverage.states)[number]) ||
      profile.coverage.municipalities.includes(municipality || '');

    const geoExplanation =
      basis === 'national'
        ? 'Empresa atua em abrangência nacional.'
        : basis === 'execution'
          ? `Local de execução (${uf || 'UF'}) compatível com a cobertura configurada no perfil.`
          : `Sede do órgão (${uf || 'UF'}) compatível. Local de execução final não detalhado no edital.`;

    // Calculate keyword matches
    const matchedKeywords = (profile.keywords as string[]).filter((kw: string) =>
      procurement.title.toLowerCase().includes(kw.toLowerCase()),
    );

    const hasCategoryMatch =
      Boolean(procurement.category) && profile.categories.includes(procurement.category || '');

    const baseScore = Math.min(
      95,
      (matchedKeywords.length > 0 ? 50 : 20) +
        (hasCategoryMatch ? 20 : 0) +
        (geoCompatible ? 20 : 0) +
        (procurement.status === 'open' ? 10 : 0),
    );

    const fitLevel: 'high' | 'medium' | 'low' =
      baseScore >= 75 ? 'high' : baseScore >= 45 ? 'medium' : 'low';

    const strengths: string[] = [];
    if (matchedKeywords.length > 0) {
      strengths.push(`Palavras-chave coincidentes no título: ${matchedKeywords.join(', ')}.`);
    }
    if (hasCategoryMatch) {
      strengths.push(`Categoria comercial compatível: ${procurement.category}.`);
    }
    if (geoCompatible) {
      strengths.push(
        `Área de atuação compatível (${basis === 'agency' ? 'sede do órgão' : 'entrega'}).`,
      );
    }

    const gaps: string[] = [];
    if (!geoCompatible) {
      gaps.push('Localização fora da área de atuação prioritária cadastrada.');
    }
    if (analysis?.risks && Array.isArray(analysis.risks)) {
      for (const r of analysis.risks.slice(0, 2)) {
        gaps.push(`Ponto de atenção: ${r.description}`);
      }
    }

    const matchingReasons = [
      ...strengths,
      procurement.deadline
        ? `Prazo de envio até ${procurement.deadline.toLocaleDateString('pt-BR')}`
        : 'Prazo de envio aberto',
    ];

    const suggestedNextSteps = [
      '1. Analisar a íntegra do edital e anexos oficiais no link do PNCP.',
      '2. Checar prazos para pedidos de esclarecimentos e impugnações.',
      '3. Verificar regularidade fiscal e disponibilidade dos atestados de capacidade técnica.',
      '4. Elaborar composição de custos e registrar a proposta dentro do prazo.',
    ];

    const briefData: OpportunityBrief = {
      organizationId,
      profileId,
      procurementId,
      status: 'COMPLETED',
      summary: `Oportunidade com aderência comercial ${fitLevel.toUpperCase()} para o perfil "${profile.name}". ${
        analysis?.summary || procurement.title
      }`,
      decisionBlocks: (analysis?.decisionBlocks as any) || undefined,
      documentCoverage: (analysis?.documentCoverage as any) || undefined,
      commercialFit: {
        score: baseScore,
        level: fitLevel,
        matchingReasons,
        geographicFit: {
          basis,
          compatible: geoCompatible,
          explanation: geoExplanation,
        },
        strengths,
        gaps,
      },
      keyRequirements: analysis?.requirements || [],
      risksAndCautions: analysis?.risks || [],
      unverifiedInformation: analysis?.unverifiedPoints || [],
      suggestedNextSteps,
      officialLinks: [
        {
          label: 'Edital no PNCP',
          url: procurement.officialUrl,
        },
      ],
      analyzedAt: new Date().toISOString(),
      disclaimer:
        'Análise informativa preliminar automatizada por inteligência artificial. Não constitui parecer jurídico nem garantia de habilitação.',
    };

    const validated = opportunityBriefSchema.parse(briefData);

    const [saved] = await this.db
      .insert(opportunityBriefs)
      .values({
        organizationId,
        profileId,
        procurementId,
        status: validated.status,
        summary: validated.summary,
        decisionBlocks: validated.decisionBlocks || null,
        documentCoverage: validated.documentCoverage || null,
        commercialFit: validated.commercialFit,
        keyRequirements: validated.keyRequirements,
        risksAndCautions: validated.risksAndCautions,
        unverifiedInformation: validated.unverifiedInformation,
        suggestedNextSteps: validated.suggestedNextSteps,
        officialLinks: validated.officialLinks,
        disclaimer: validated.disclaimer,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          opportunityBriefs.organizationId,
          opportunityBriefs.profileId,
          opportunityBriefs.procurementId,
        ],
        set: {
          status: validated.status,
          summary: validated.summary,
          decisionBlocks: validated.decisionBlocks || null,
          documentCoverage: validated.documentCoverage || null,
          commercialFit: validated.commercialFit,
          keyRequirements: validated.keyRequirements,
          risksAndCautions: validated.risksAndCautions,
          unverifiedInformation: validated.unverifiedInformation,
          suggestedNextSteps: validated.suggestedNextSteps,
          officialLinks: validated.officialLinks,
          updatedAt: new Date(),
        },
      })
      .returning();

    logger.info(
      { organizationId, profileId, procurementId, briefId: saved?.id },
      'Opportunity Brief personalizado gerado com sucesso',
    );

    return { ...validated, id: saved?.id };
  }

  async getBrief(organizationId: string, procurementId: string): Promise<OpportunityBrief | null> {
    const brief = await this.db.query.opportunityBriefs.findFirst({
      where: and(
        eq(opportunityBriefs.organizationId, organizationId),
        eq(opportunityBriefs.procurementId, procurementId),
      ),
    });

    if (!brief) return null;

    // A provider/model change or manual reanalysis must also refresh the company's brief.
    const analysis = await this.analyzer.analyze(procurementId);
    if (new Date(analysis.analyzedAt).getTime() > brief.updatedAt.getTime()) {
      return this.generateBrief({ organizationId, procurementId, profileId: brief.profileId });
    }

    return opportunityBriefSchema.parse({
      id: brief.id,
      organizationId: brief.organizationId,
      profileId: brief.profileId,
      procurementId: brief.procurementId,
      status: brief.status,
      summary: brief.summary,
      decisionBlocks: brief.decisionBlocks || undefined,
      documentCoverage: brief.documentCoverage || undefined,
      commercialFit: brief.commercialFit,
      keyRequirements: brief.keyRequirements,
      risksAndCautions: brief.risksAndCautions,
      unverifiedInformation: brief.unverifiedInformation,
      suggestedNextSteps: brief.suggestedNextSteps,
      officialLinks: brief.officialLinks,
      analyzedAt: brief.updatedAt.toISOString(),
      disclaimer: brief.disclaimer,
    });
  }
}
