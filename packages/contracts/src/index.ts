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
      .regex(/^\d{14}$/)
      .optional(),
  })
  .strict();
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
