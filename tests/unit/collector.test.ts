import { describe, it, expect, vi } from 'vitest';
import { stableHash, assertApprovedUrl } from '../../packages/source-sdk/src/index.js';
import { PncpConnector } from '../../apps/collector/src/connectors/pncp/pncp.connector.js';
import { normalizePncp, pncpTimestamp } from '../../apps/collector/src/normalizers/pncp.js';
describe('coleta', () => {
  it('gera hash independente da ordem das chaves', () =>
    expect(stableHash({ a: 1, b: { c: 2, d: 3 } })).toBe(stableHash({ b: { d: 3, c: 2 }, a: 1 })));
  it.each([
    'http://pncp.gov.br/',
    'https://127.0.0.1/',
    'https://pncp.gov.br.evil.test/',
    'https://u:p@pncp.gov.br/',
    'https://pncp.gov.br:4430/',
  ])('recusa URL não homologada %s', (url) =>
    expect(() => assertApprovedUrl(url, 'https://pncp.gov.br')).toThrow(),
  );
  it('preserva o fuso do PNCP', () =>
    expect(pncpTimestamp('2026-10-11T12:00:00')).toBe('2026-10-11T15:00:00.000Z'));
  it('não confunde sede do órgão com execução', () => {
    const data = normalizePncp({
      numeroControlePNCP: 'test-only',
      objetoCompra: 'TESTE',
      orgaoEntidade: { razaoSocial: 'TESTE', cnpj: '00000000000000' },
      unidadeOrgao: { ufSigla: 'SP', codigoIbge: '3550308' },
      anoCompra: 2026,
      sequencialCompra: 1,
      situacaoCompraId: 1,
      dataPublicacaoPncp: '2026-10-11T12:00:00',
      dataAtualizacao: '2026-10-11T12:00:00',
    });
    expect(data.executionState).toBeNull();
    expect(data.agencyState).toBe('SP');
    expect(data.deadline).toBeNull();
  });
  it('pagina cada modalidade e inclui a modalidade obrigatória', async () => {
    const request = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = new URL(String(input));
      return new Response(
        JSON.stringify({
          data: [
            {
              numeroControlePNCP: `${url.searchParams.get('codigoModalidadeContratacao')}-${url.searchParams.get('pagina')}`,
            },
          ],
          totalPaginas: 2,
        }),
        { status: 200 },
      );
    });
    const rows = [];
    for await (const row of new PncpConnector(request, 0).collect({
      since: new Date('2026-10-01'),
      until: new Date('2026-10-02'),
    }))
      rows.push(row.externalId);
    expect(rows).toEqual(['6-1', '6-2', '8-1', '8-2']);
    expect(request).toHaveBeenCalledTimes(4);
  });
  it('encerra tentativas em erros persistentes', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 }));
    await expect(async () => {
      for await (const _row of new PncpConnector(request, 0).collect({
        since: new Date(),
        until: new Date(),
      })) {
        /* consume */
      }
    }).rejects.toThrow('503');
    expect(request).toHaveBeenCalledTimes(4);
  });
});
