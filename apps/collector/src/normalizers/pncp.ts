import { z } from 'zod';
import type { CanonicalProcurement } from '@radar/contracts';
const schema = z.object({
  numeroControlePNCP: z.string(),
  objetoCompra: z.string(),
  orgaoEntidade: z.object({ razaoSocial: z.string(), cnpj: z.string() }),
  unidadeOrgao: z.object({
    ufSigla: z.string(),
    codigoIbge: z.string().or(z.number()).transform(String),
  }),
  anoCompra: z.number(),
  sequencialCompra: z.number(),
  situacaoCompraId: z.number(),
  dataPublicacaoPncp: z.string(),
  dataAtualizacao: z.string(),
  dataEncerramentoProposta: z.string().nullable().optional(),
  valorTotalEstimado: z.number().nullable().optional(),
});
// PNCP timestamps without offsets are Brasília local time, never interpreted in host timezone.
export function pncpTimestamp(input: string) {
  return new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(input) ? input : `${input}-03:00`).toISOString();
}
export function normalizePncp(raw: unknown): CanonicalProcurement {
  const data = schema.parse(raw);
  return {
    externalId: data.numeroControlePNCP,
    title: data.objetoCompra,
    agency: data.orgaoEntidade.razaoSocial,
    agencyState: data.unidadeOrgao.ufSigla,
    agencyMunicipality: data.unidadeOrgao.codigoIbge,
    executionState: null,
    executionMunicipality: null,
    category: null,
    status:
      data.situacaoCompraId === 1 ? 'open' : data.situacaoCompraId === 2 ? 'cancelled' : 'closed',
    publishedAt: pncpTimestamp(data.dataPublicacaoPncp),
    sourceUpdatedAt: pncpTimestamp(data.dataAtualizacao),
    deadline: data.dataEncerramentoProposta ? pncpTimestamp(data.dataEncerramentoProposta) : null,
    estimatedValue: data.valorTotalEstimado == null ? null : data.valorTotalEstimado.toFixed(2),
    officialUrl: `https://pncp.gov.br/app/editais/${data.orgaoEntidade.cnpj}/${data.anoCompra}/${data.sequencialCompra}`,
  };
}
