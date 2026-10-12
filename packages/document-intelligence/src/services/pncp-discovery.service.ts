import { z } from 'zod';
import { assertApprovedUrl, APPROVED_GOV_ORIGINS } from '@radar/source-sdk';
import { logger } from '@radar/config';

export const pncpFileEnvelopeSchema = z.object({
  sequencialDocumento: z.coerce.number().int(),
  url: z.string(),
  tipoDocumentoId: z.coerce.number().int().optional().default(1),
  tipoDocumentoNome: z.string().nullable().optional().default('Documento'),
  titulo: z.string().nullable().optional().default(''),
  dataPublicacaoPncp: z.string().nullable().optional().default(''),
});
export type PncpFileEnvelope = z.infer<typeof pncpFileEnvelopeSchema>;

export const pncpFilesListSchema = z.array(pncpFileEnvelopeSchema);

export interface DocumentInventoryItem {
  id: string;
  documentIndex: number;
  title: string;
  documentType: string;
  typeId: number;
  url: string;
  isPriority: boolean;
  publishedAt: string;
  status: 'discovered' | 'downloaded' | 'parsed' | 'failed' | 'ignored';
  errorReason?: string;
  byteSize?: number;
  documentHash?: string;
}

export interface DocumentInventory {
  procurementId: string;
  cnpj: string;
  ano: number;
  sequencial: number;
  discoveredAt: string;
  totalDiscovered: number;
  priorityCount: number;
  items: DocumentInventoryItem[];
}

export class PncpDiscoveryError extends Error {
  constructor(message: string, public readonly status?: number, public readonly cause?: unknown) {
    super(message);
    this.name = 'PncpDiscoveryError';
  }
}

export function parsePncpIdentifiers(input?: string | null): { cnpj: string; ano: number; sequencial: number } | null {
  if (!input || typeof input !== 'string') return null;
  // 1. Tenta extrair da URL oficial do PNCP: /editais/{cnpj}/{ano}/{sequencial}
  const matchUrl = input.match(/\/editais\/(\d{14})\/(\d{4})\/(\d+)/);
  if (matchUrl && matchUrl[1] && matchUrl[2] && matchUrl[3]) {
    return {
      cnpj: matchUrl[1],
      ano: parseInt(matchUrl[2], 10),
      sequencial: parseInt(matchUrl[3], 10),
    };
  }

  // 2. Tenta extrair do número de controle PNCP: {cnpj}-{sequencialAno}/{ano} (ex: 00394452000103-1-000518/2026)
  const matchControle = input.match(/^(\d{14})-(?:\d+)-0*(\d+)\/(\d{4})$/);
  if (matchControle && matchControle[1] && matchControle[2] && matchControle[3]) {
    return {
      cnpj: matchControle[1],
      ano: parseInt(matchControle[3], 10),
      sequencial: parseInt(matchControle[2], 10),
    };
  }

  return null;
}

export function isPriorityDocument(tipoNome?: string | null, titulo?: string | null, tipoId?: number): boolean {
  if (tipoId === 1 || tipoId === 2 || tipoId === 3) return true;
  const combined = `${tipoNome || ''} ${titulo || ''}`.toLowerCase();
  return /edital|termo\s+de\s+refer[eê]ncia|projeto\s+b[aá]sico|especifica[cç][oõ]es/i.test(combined);
}

export class PncpDocumentDiscoveryService {
  constructor(
    private readonly baseUrl = 'https://pncp.gov.br/api/pncp/v1',
    private readonly timeoutMs = 12000,
  ) {}

  async discoverFiles(params: {
    procurementId: string;
    officialUrl: string;
    externalId?: string;
  }): Promise<DocumentInventory> {
    const ids = parsePncpIdentifiers(params.officialUrl) || (params.externalId ? parsePncpIdentifiers(params.externalId) : null);

    if (!ids) {
      throw new PncpDiscoveryError(
        `Não foi possível extrair identificadores do PNCP (CNPJ, ano e sequencial) a partir de: ${params.officialUrl}`,
      );
    }

    const endpoint = `${this.baseUrl}/orgaos/${ids.cnpj}/compras/${ids.ano}/${ids.sequencial}/arquivos`;

    try {
      assertApprovedUrl(endpoint, 'https://pncp.gov.br');
    } catch (urlErr) {
      throw new PncpDiscoveryError(`URL do PNCP rejeitada pela política SSRF: ${endpoint}`, undefined, urlErr);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json, */*',
          'User-Agent': 'RadarDeLicitacoes-Bot/1.0 (+https://radar.gov)',
        },
        signal: controller.signal,
      });
    } catch (netErr) {
      clearTimeout(timer);
      const isTimeout = netErr instanceof Error && netErr.name === 'AbortError';
      throw new PncpDiscoveryError(
        isTimeout
          ? `Timeout (${this.timeoutMs}ms) ao consultar arquivos no PNCP para a compra ${ids.ano}/${ids.sequencial}.`
          : `Falha de rede ao consultar arquivos no PNCP: ${netErr instanceof Error ? netErr.message : String(netErr)}`,
        isTimeout ? 504 : undefined,
        netErr,
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new PncpDiscoveryError(
        `PNCP respondeu HTTP ${response.status} ao consultar arquivos: ${errText.slice(0, 160)}`,
        response.status,
      );
    }

    let rawList: unknown;
    try {
      rawList = await response.json();
    } catch (jsonErr) {
      throw new PncpDiscoveryError('PNCP retornou JSON inválido para a lista de arquivos.', 502, jsonErr);
    }

    const parsed = pncpFilesListSchema.safeParse(rawList);
    if (!parsed.success) {
      logger.warn({ issues: parsed.error.issues }, 'Aviso: envelope de arquivos do PNCP diverge do esperado');
      throw new PncpDiscoveryError('Envelope de resposta de arquivos do PNCP inválido.', 502, parsed.error);
    }

    const items: DocumentInventoryItem[] = parsed.data.map((item, idx) => {
      const isPriority = isPriorityDocument(item.tipoDocumentoNome, item.titulo, item.tipoDocumentoId);
      return {
        id: `pncp-doc-${item.sequencialDocumento}`,
        documentIndex: item.sequencialDocumento,
        title: item.titulo || item.tipoDocumentoNome || `Documento ${idx + 1}`,
        documentType: item.tipoDocumentoNome || 'Documento',
        typeId: item.tipoDocumentoId,
        url: item.url,
        isPriority,
        publishedAt: item.dataPublicacaoPncp || new Date().toISOString(),
        status: 'discovered',
      };
    });

    const priorityCount = items.filter((i) => i.isPriority).length;

    return {
      procurementId: params.procurementId,
      cnpj: ids.cnpj,
      ano: ids.ano,
      sequencial: ids.sequencial,
      discoveredAt: new Date().toISOString(),
      totalDiscovered: items.length,
      priorityCount,
      items,
    };
  }
}
