import { describe, it, expect, vi } from 'vitest';
import {
  parsePncpIdentifiers,
  isPriorityDocument,
  PncpDocumentDiscoveryService,
  PncpDiscoveryError,
} from '../../packages/document-intelligence/src/index.js';

describe('Descoberta e Inventário de Documentos do PNCP', () => {
  describe('parsePncpIdentifiers', () => {
    it('extrai CNPJ, ano e sequencial da URL oficial do PNCP', () => {
      const url = 'https://pncp.gov.br/app/editais/83102277000152/2026/518';
      const result = parsePncpIdentifiers(url);

      expect(result).toEqual({
        cnpj: '83102277000152',
        ano: 2026,
        sequencial: 518,
      });
    });

    it('extrai identificadores a partir do número de controle PNCP', () => {
      const numeroControle = '00394452000103-1-000518/2026';
      const result = parsePncpIdentifiers(numeroControle);

      expect(result).toEqual({
        cnpj: '00394452000103',
        ano: 2026,
        sequencial: 518,
      });
    });

    it('retorna null para formatos inválidos', () => {
      expect(parsePncpIdentifiers('https://outro-site.com/licitacao')).toBeNull();
      expect(parsePncpIdentifiers('')).toBeNull();
    });
  });

  describe('isPriorityDocument', () => {
    it('identifica Editais e Termos de Referência como prioritários', () => {
      expect(isPriorityDocument('Edital', 'Edital PE 10/2026', 1)).toBe(true);
      expect(isPriorityDocument('Termo de Referência', 'TR Anexo I', 2)).toBe(true);
      expect(isPriorityDocument(null, 'Projeto Básico', 3)).toBe(true);
      expect(isPriorityDocument('Documento', 'Especificações Técnicas', 99)).toBe(true);
    });

    it('classifica avisos, minutas e recibos como secundários', () => {
      expect(isPriorityDocument('Aviso', 'Aviso de Licitação', 10)).toBe(false);
      expect(isPriorityDocument('Minuta', 'Minuta de Contrato', 5)).toBe(false);
    });
  });

  describe('PncpDocumentDiscoveryService', () => {
    it('mapeia resposta de arquivos da API do PNCP em inventário estruturado', async () => {
      const service = new PncpDocumentDiscoveryService('https://pncp.gov.br/api/pncp/v1');

      const mockResponse = [
        {
          sequencialDocumento: 1,
          url: 'https://pncp.gov.br/arquivos/edital.pdf',
          tipoDocumentoId: 1,
          tipoDocumentoNome: 'Edital',
          titulo: 'Edital de Pregão 148/2026',
          dataPublicacaoPncp: '2026-09-03T07:28:02',
        },
        {
          sequencialDocumento: 2,
          url: 'https://pncp.gov.br/arquivos/tr.pdf',
          tipoDocumentoId: 2,
          tipoDocumentoNome: 'Termo de Referência',
          titulo: 'Anexo I - Termo de Referência',
          dataPublicacaoPncp: '2026-09-03T07:28:02',
        },
        {
          sequencialDocumento: 3,
          url: 'https://pncp.gov.br/arquivos/aviso.pdf',
          tipoDocumentoId: 10,
          tipoDocumentoNome: 'Aviso',
          titulo: 'Aviso de Publicação',
          dataPublicacaoPncp: '2026-09-03T07:28:02',
        },
      ];

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      }) as any;

      try {
        const inventory = await service.discoverFiles({
          procurementId: '00000000-0000-0000-0000-000000000001',
          officialUrl: 'https://pncp.gov.br/app/editais/83102277000152/2026/518',
        });

        expect(inventory.cnpj).toBe('83102277000152');
        expect(inventory.ano).toBe(2026);
        expect(inventory.sequencial).toBe(518);
        expect(inventory.totalDiscovered).toBe(3);
        expect(inventory.priorityCount).toBe(2);
        expect(inventory.items[0]?.isPriority).toBe(true);
        expect(inventory.items[0]?.documentType).toBe('Edital');
        expect(inventory.items[2]?.isPriority).toBe(false);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('trata erros 504 e falhas de rede lançando PncpDiscoveryError', async () => {
      const service = new PncpDocumentDiscoveryService();

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 504,
        text: async () => 'Gateway Timeout',
      }) as any;

      try {
        await expect(
          service.discoverFiles({
            procurementId: '00000000-0000-0000-0000-000000000001',
            officialUrl: 'https://pncp.gov.br/app/editais/83102277000152/2026/518',
          }),
        ).rejects.toThrow(PncpDiscoveryError);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
