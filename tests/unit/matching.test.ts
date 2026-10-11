import { describe, it, expect } from 'vitest';
import {
  matchProcurement,
  profileInput,
  type CanonicalProcurement,
} from '../../packages/contracts/src/index.js';
const profile = profileInput.parse({
  name: 'Escritório',
  keywords: ['impressora'],
  coverage: { states: ['SP'] },
});
const procurement: CanonicalProcurement = {
  externalId: 'test-only',
  title: 'Aquisição de IMPRESSORAS',
  agency: 'TESTE AUTOMATIZADO',
  agencyState: 'SP',
  agencyMunicipality: '3550308',
  executionState: null,
  executionMunicipality: null,
  category: null,
  status: 'open',
  publishedAt: '2026-01-01T00:00:00Z',
  deadline: '2030-01-01T00:00:00Z',
  estimatedValue: null,
  officialUrl: 'https://pncp.gov.br',
  sourceUpdatedAt: '2026-01-01T00:00:00Z',
};
describe('matching determinístico', () => {
  it('explica a referência geográfica do órgão', () => {
    const result = matchProcurement(profile, procurement);
    expect(result.matches).toBe(true);
    expect(result.geographyBasis).toBe('agency');
    expect(result.reasons).toContain('Localização do órgão compatível; execução não informada');
  });
  it('prioriza o local de execução quando conhecido', () =>
    expect(
      matchProcurement(profile, {
        ...procurement,
        executionState: 'RJ',
        executionMunicipality: '3304557',
      }).matches,
    ).toBe(false));
  it.each([
    { status: 'cancelled' as const },
    { deadline: null },
    { deadline: '2020-01-01T00:00:00Z' },
    { agencyState: 'RJ' },
    { title: 'Construção de ponte' },
  ])('descarta oportunidade incompatível %j', (changes) =>
    expect(matchProcurement(profile, { ...procurement, ...changes }).matches).toBe(false),
  );
  it('aceita categoria compatível sem palavra-chave', () =>
    expect(
      matchProcurement(
        { ...profile, categories: ['office'] },
        { ...procurement, title: 'Material', category: 'office' },
      ).matches,
    ).toBe(true));
  it('normaliza acentos', () =>
    expect(matchProcurement({ ...profile, keywords: ['aquisiçao'] }, procurement).matches).toBe(
      true,
    ));
  it('rejeita campos privados injetados pelo cliente', () =>
    expect(() => profileInput.parse({ ...profile, organizationId: 'injected' })).toThrow());
});
