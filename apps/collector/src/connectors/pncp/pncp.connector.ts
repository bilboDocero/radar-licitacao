import type { CollectionContext, RawSourceRecord, SourceConnector } from '@radar/source-sdk';
import { assertApprovedUrl } from '@radar/source-sdk';
import { z } from 'zod';
const pageSchema = z.object({
  data: z.array(z.object({ numeroControlePNCP: z.string() }).passthrough()),
  totalPaginas: z.number().int().nonnegative(),
});
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const date = (d: Date) => d.toISOString().slice(0, 10).replaceAll('-', '');
export class PncpConnector implements SourceConnector {
  readonly sourceId = 'pncp';
  constructor(
    private readonly request: typeof fetch = fetch,
    private readonly delay = 1000,
  ) {}
  async *collect(context: CollectionContext): AsyncIterable<RawSourceRecord> {
    // Initial homologated scope: electronic auction (6) and direct award (8).
    for (const modality of [6, 8]) {
      let page = 1;
      let pages = 1;
      do {
        const url = new URL('https://pncp.gov.br/api/consulta/v1/contratacoes/atualizacao');
        url.search = new URLSearchParams({
          dataInicial: date(context.since),
          dataFinal: date(context.until),
          codigoModalidadeContratacao: String(modality),
          pagina: String(page),
          tamanhoPagina: '50',
        }).toString();
        assertApprovedUrl(url.href, 'https://pncp.gov.br');
        let response: Response | undefined;
        for (let attempt = 0; attempt < 4; attempt++) {
          context.signal?.throwIfAborted();
          try {
            await pause(this.delay * (attempt ? 2 ** attempt : 1));
            response = await this.request(url, {
              signal: context.signal
                ? AbortSignal.any([context.signal, AbortSignal.timeout(30000)])
                : AbortSignal.timeout(30000),
              redirect: 'error',
              headers: { Accept: 'application/json', 'User-Agent': 'Radar-Licitacoes-MVP/0.1' },
            });
            if (response.status !== 429 && response.status < 500) break;
          } catch (error) {
            if (attempt === 3 || context.signal?.aborted) throw error;
          }
        }
        if (!response || !response.ok)
          throw new Error(`PNCP respondeu ${response?.status ?? 'sem resposta'}`);
        if (response.status === 204) break;
        const result = pageSchema.parse(await response.json());
        pages = result.totalPaginas;
        if (pages > 10000) throw new Error('Janela excede limite de segurança; reduza o período');
        for (const payload of result.data)
          yield { externalId: payload.numeroControlePNCP, payload, collectedAt: new Date() };
        page++;
      } while (page <= pages);
    }
  }
}
