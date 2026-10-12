import { z } from 'zod';
export const states = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;
export const organizationInput = z
  .object({
    name: z.string().trim().min(3).max(160),
    cnpj: z
      .string()
      .trim()
      .transform((val) => val.replace(/\D/g, ''))
      .refine((val) => val.length === 0 || val.length === 14, {
        message: 'CNPJ deve conter 14 dígitos numéricos',
      })
      .transform((val) => (val.length === 14 ? val : undefined))
      .optional(),
  })
  .strict();
export const updateOrganizationInput = z
  .object({
    name: z.string().trim().min(3).max(160).optional(),
    cnpj: z
      .string()
      .trim()
      .transform((val) => val.replace(/\D/g, ''))
      .refine((val) => val.length === 14, {
        message: 'CNPJ deve conter 14 dígitos numéricos',
      })
      .optional(),
  })
  .strict();
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationInput>;

export const organizationRegistryViewSchema = z.object({
  cnpj: z.string(),
  legalName: z.string().nullable(),
  tradeName: z.string().nullable(),

  registrationStatus: z.string().nullable(),
  openedAt: z.string().nullable(),
  establishmentType: z.string().nullable(),

  legalNature: z.string().nullable(),
  companySize: z.string().nullable(),
  shareCapital: z.string().nullable(),

  primaryActivity: z
    .object({
      code: z.string(),
      description: z.string(),
    })
    .nullable(),

  secondaryActivities: z.array(
    z.object({
      code: z.string(),
      description: z.string(),
    }),
  ),

  address: z.object({
    postalCode: z.string().nullable(),
    street: z.string().nullable(),
    number: z.string().nullable(),
    complement: z.string().nullable(),
    neighborhood: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    country: z.string().nullable(),
  }),

  email: z.string().nullable(),
  phone: z.string().nullable(),

  simpleTaxRegime: z.boolean().nullable(),
  mei: z.boolean().nullable(),

  source: z.enum(['brasilapi', 'cnpjws', 'mock']),
  fetchedAt: z.string(),
  sourceUpdatedAt: z.string().nullable(),
  isCached: z.boolean().optional(),
});
export type OrganizationRegistryView = z.infer<typeof organizationRegistryViewSchema>;
export const coverageSchema = z
  .object({
    national: z.boolean().default(false),
    states: z.array(z.enum(states)).max(27).default([]),
    municipalities: z
      .array(z.string().regex(/^\d{7}$/))
      .max(100)
      .default([]),
  })
  .strict();
export const profileInput = z
  .object({
    name: z.string().trim().min(2).max(100),
    keywords: z.array(z.string().trim().min(2).max(80)).min(1).max(30),
    categories: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
    coverage: coverageSchema,
  })
  .strict();
export const sourceRequestInput = z
  .object({
    name: z.string().trim().min(3).max(150),
    url: z
      .string()
      .url()
      .max(500)
      .refine((v) => new URL(v).protocol === 'https:', 'Utilize uma URL HTTPS'),
    reason: z.string().trim().min(10).max(1000),
  })
  .strict();
export const searchInput = z.object({
  q: z.string().max(150).default(''),
  uf: z.enum(states).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  open: z.enum(['true', 'false']).optional(),
});
export const alertPreferenceInput = z
  .object({ enabled: z.boolean(), frequency: z.enum(['daily', 'weekly']) })
  .strict();
export const partnerInput = z
  .object({
    name: z.string().trim().min(3).max(150),
    ownerEmail: z.string().email(),
    brandName: z.string().trim().max(100).optional(),
  })
  .strict();
export const invitationInput = z.object({ email: z.string().email() }).strict();
export type Coverage = z.infer<typeof coverageSchema>;
export type CommercialProfile = z.infer<typeof profileInput>;
export type Role = 'owner' | 'admin' | 'member';
export type TenantContext = { organizationId: string; userId: string; role: Role };
export interface CanonicalProcurement {
  externalId: string;
  title: string;
  agency: string;
  agencyState: string;
  agencyMunicipality: string;
  executionState: string | null;
  executionMunicipality: string | null;
  category: string | null;
  status: 'open' | 'closed' | 'cancelled';
  publishedAt: string;
  deadline: string | null;
  estimatedValue: string | null;
  officialUrl: string;
  sourceUpdatedAt: string;
}
export interface MatchResult {
  matches: boolean;
  score: number;
  reasons: string[];
  geographyBasis: 'execution' | 'agency' | 'national';
}
const normalize = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
/** Deterministic strategy, shared with the asynchronous worker. Agency location is explicitly a fallback. */
export function matchProcurement(
  profile: CommercialProfile,
  procurement: CanonicalProcurement,
  now = new Date(),
): MatchResult {
  const reasons: string[] = [];
  const basis = profile.coverage.national
    ? 'national'
    : procurement.executionMunicipality || procurement.executionState
      ? 'execution'
      : 'agency';
  const result = (matches: boolean): MatchResult => ({
    matches,
    score: matches ? reasons.length * 25 : 0,
    reasons,
    geographyBasis: basis,
  });
  if (
    procurement.status !== 'open' ||
    !procurement.deadline ||
    new Date(procurement.deadline) <= now
  )
    return result(false);
  const uf = basis === 'execution' ? procurement.executionState : procurement.agencyState;
  const municipality =
    basis === 'execution' ? procurement.executionMunicipality : procurement.agencyMunicipality;
  if (
    !profile.coverage.national &&
    !profile.coverage.states.includes(uf as (typeof states)[number]) &&
    !profile.coverage.municipalities.includes(municipality || '')
  )
    return result(false);
  const words = profile.keywords.filter((k) => normalize(procurement.title).includes(normalize(k)));
  const category = !!procurement.category && profile.categories.includes(procurement.category);
  if (!words.length && !category) return result(false);
  if (words.length) reasons.push(`Palavras-chave: ${words.join(', ')}`);
  if (category) reasons.push('Categoria compatível');
  reasons.push(
    basis === 'agency'
      ? 'Localização do órgão compatível; execução não informada'
      : basis === 'national'
        ? 'Área comercial nacional'
        : 'Local de execução compatível',
  );
  reasons.push('Prazo de proposta ainda aberto');
  return result(true);
}

export const aiTaskTypes = [
  'procurement.classification',
  'document.requirements_extraction',
  'document.risk_review',
  'opportunity.brief_generation',
] as const;
export type AITaskType = (typeof aiTaskTypes)[number];

export const aiAnalysisStatuses = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'PARTIAL',
  'FAILED',
  'REQUIRES_REVIEW',
  'SKIPPED_BUDGET',
] as const;
export type AIAnalysisStatus = (typeof aiAnalysisStatuses)[number];

export const requirementCategories = [
  'objeto',
  'itens_quantitativos',
  'modalidade',
  'prazo_propostas',
  'esclarecimento_impugnacao',
  'local_execucao_entrega',
  'condicoes_logisticas',
  'habilitacao_juridica',
  'regularidade_fiscal_trabalhista',
  'qualificacao_economico_financeira',
  'qualificacao_tecnica',
  'atestados_capacidade',
  'certificacoes_especificas',
  'visita_tecnica',
  'garantias',
  'criterio_julgamento',
  'condicoes_pagamento',
  'prazos_execucao',
  'riscos_atencao',
  'outros',
] as const;
export type RequirementCategory = (typeof requirementCategories)[number];

export const verificationStates = ['extracted', 'inferred', 'not_found', 'unverified'] as const;
export type VerificationState = (typeof verificationStates)[number];

export const requirementSchema = z.object({
  id: z.string(),
  category: z.enum(requirementCategories),
  title: z.string(),
  description: z.string(),
  status: z.enum(verificationStates),
  sourceDocument: z.string().nullable().default(null),
  page: z.number().int().nullable().default(null),
  section: z.string().nullable().default(null),
  textExcerpt: z.string().nullable().default(null),
  confidence: z.enum(['high', 'medium', 'low']).default('high'),
  notes: z.string().nullable().default(null),
});
export type Requirement = z.infer<typeof requirementSchema>;

export const riskItemSchema = z.object({
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  sourceDocument: z.string().nullable().default(null),
  page: z.number().int().nullable().default(null),
  textExcerpt: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});
export type RiskItem = z.infer<typeof riskItemSchema>;

export const executionPlaceSchema = z.object({
  state: z.string().nullable(),
  municipality: z.string().nullable(),
  details: z.string().nullable(),
});
export type ExecutionPlace = z.infer<typeof executionPlaceSchema>;

export const tenderRequirementsExtractionSchema = z.object({
  summary: z.string(),
  executionPlace: executionPlaceSchema.nullable().default(null),
  requirements: z.array(requirementSchema),
  risks: z.array(riskItemSchema),
  unverifiedPoints: z.array(z.string()),
});
export type TenderRequirementsExtraction = z.infer<typeof tenderRequirementsExtractionSchema>;

export const procurementAIAnalysisSchema = tenderRequirementsExtractionSchema.extend({
  procurementId: z.string().uuid(),
  version: z.number().int(),
  status: z.enum(aiAnalysisStatuses),
  model: z.string(),
  provider: z.string(),
  promptVersion: z.string(),
  analyzedAt: z.string(),
});
export type ProcurementAIAnalysis = z.infer<typeof procurementAIAnalysisSchema>;

export const opportunityBriefSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  procurementId: z.string().uuid(),
  profileId: z.string().uuid(),
  status: z.enum(aiAnalysisStatuses),
  summary: z.string(),
  commercialFit: z.object({
    score: z.number().min(0).max(100),
    level: z.enum(['high', 'medium', 'low']),
    matchingReasons: z.array(z.string()),
    geographicFit: z.object({
      basis: z.enum(['execution', 'agency', 'national']),
      compatible: z.boolean(),
      explanation: z.string(),
    }),
    strengths: z.array(z.string()),
    gaps: z.array(z.string()),
  }),
  keyRequirements: z.array(requirementSchema),
  risksAndCautions: z.array(riskItemSchema),
  unverifiedInformation: z.array(z.string()),
  suggestedNextSteps: z.array(z.string()),
  officialLinks: z.array(z.object({ label: z.string(), url: z.string().url() })),
  analyzedAt: z.string(),
  disclaimer: z.string().default(
    'Análise informativa preliminar automatizada por inteligência artificial. Não constitui parecer jurídico nem garantia de habilitação.',
  ),
});
export type OpportunityBrief = z.infer<typeof opportunityBriefSchema>;

export const aiUsageRecordSchema = z.object({
  id: z.string().uuid().optional(),
  provider: z.string(),
  model: z.string(),
  taskType: z.enum(aiTaskTypes),
  procurementId: z.string().uuid().nullable().default(null),
  procurementVersion: z.number().int().nullable().default(null),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  latencyMs: z.number().int().nonnegative(),
  costUsd: z.string(),
  status: z.enum(['success', 'error', 'skipped_budget']),
  errorMessage: z.string().nullable().default(null),
  createdAt: z.string().optional(),
});
export type AIUsageRecord = z.infer<typeof aiUsageRecordSchema>;

