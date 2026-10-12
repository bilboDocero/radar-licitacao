import { describe, it, expect, vi } from 'vitest';
import {
  DocumentExtractionService,
  EvidenceVerifier,
  MockAIProvider,
  AIModelRouter,
} from '../../packages/document-intelligence/src/index.js';
import type { Requirement, RiskItem, TenderRequirementsExtraction } from '../../packages/contracts/src/index.js';
import { tenderRequirementsExtractionSchema } from '../../packages/contracts/src/index.js';

describe('Pipeline Documental & Validador de Evidências', () => {
  describe('DocumentExtractionService', () => {
    it('segmenta texto com metadados estruturados de chunking (id, ordem, hash, páginas, tokens)', () => {
      const fakeDb = {} as any;
      const service = new DocumentExtractionService(fakeDb);

      const rawText = `
      PREÂMBULO
      Pregão Eletrônico 10/2026.
      [Página 1]
      1. DO OBJETO
      Aquisição de veículos utilitários para transporte de cargas.
      [Página 2]
      2. DA HABILITAÇÃO JURÍDICA E TÉCNICA
      Apresentar contrato social e atestado de capacidade técnica prévio.
      [Página 3]
      3. DOS PRAZOS E PENALIDADES
      Multa moratória de 0,5% ao dia por atraso.
      `;

      const sections = service.extractSectionsFromText(rawText);
      expect(sections.length).toBeGreaterThanOrEqual(3);

      const secPre = sections[0];
      expect(secPre?.id).toBe('sec-01');

      const secObj = sections.find((s) => /objeto/i.test(s.title));
      expect(secObj).toBeDefined();
      expect(secObj?.id).toBe('sec-02');
      expect(secObj?.order).toBe(2);
      expect(secObj?.startPage).toBe(1);
      expect(secObj?.contentHash).toMatch(/^[a-f0-9]{64}$/);
      expect(secObj?.estimatedTokens).toBeGreaterThan(5);

      const secHab = sections.find((s) => /habilita/i.test(s.title));
      expect(secHab).toBeDefined();
      expect(secHab?.startPage).toBe(2);
      expect(secHab?.contentHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('extrai texto de buffer textual com estimativa de páginas', async () => {
      const fakeDb = {} as any;
      const service = new DocumentExtractionService(fakeDb);

      const buffer = Buffer.from('Edital de Pregão Eletrônico número 50.\nObjeto: Fornecimento de Merenda Escolar.');
      const result = await service.extractTextFromBuffer(buffer, 'edital.txt');

      expect(result.isPdf).toBe(false);
      expect(result.text).toContain('Merenda Escolar');
      expect(result.pageCount).toBeGreaterThanOrEqual(1);
      expect(result.unreadablePages).toEqual([]);
    });

    it('lança erro explícito para PDF corrompido sem decodificar como lixo UTF-8', async () => {
      const fakeDb = {} as any;
      const service = new DocumentExtractionService(fakeDb);

      const corruptedBuffer = Buffer.from('%PDF-1.4\ncorrupted-binary-without-pdf-xref-table');
      await expect(
        service.extractTextFromBuffer(corruptedBuffer, 'edital-corrompido.pdf'),
      ).rejects.toThrow(/Falha ao extrair PDF.*corrompido/);
    });
  });

  describe('EvidenceVerifier (Validação Rigorosa de Citações e Trechos)', () => {
    const documentText = `
    [Página 1]
    PREFEITURA MUNICIPAL DE SÃO PAULO
    EDITAL DE PREGÃO ELETRÔNICO Nº 45/2026
    Objeto: Contratação de serviços de limpeza e conservação predial com fornecimento de insumos.
    [Página 2]
    CLÁUSULA QUARTA - DA HABILITAÇÃO
    4.1. O licitante deverá apresentar Certidão Negativa de Débitos Trabalhistas (CNDT) válida.
    4.2. Comprovação de aptidão com no mínimo 2 (dois) atestados de capacidade técnica emitidos por pessoa jurídica.
    [Página 3]
    CLÁUSULA QUINTA - DOS PRAZOS
    5.1. O prazo de entrega do plano de trabalho é de 5 dias úteis após a assinatura.
    `;

    it('confirma como "extracted" trechos que existem literalmente no edital e valida a página real', () => {
      const requirements: Requirement[] = [
        {
          id: 'req-01',
          category: 'habilitacao_juridica',
          title: 'Certidão Negativa Trabalhista',
          description: 'Apresentação de CNDT válida.',
          status: 'extracted',
          sourceDocument: 'edital.pdf',
          page: 2,
          section: '4. Da Habilitação',
          textExcerpt: 'Certidão Negativa de Débitos Trabalhistas (CNDT) válida',
          confidence: 'high',
          notes: null,
        },
      ];

      const risks: RiskItem[] = [
        {
          description: 'Prazo estrito para entrega do plano',
          severity: 'medium',
          sourceDocument: 'edital.pdf',
          page: 3,
          textExcerpt: 'O prazo de entrega do plano de trabalho é de 5 dias úteis',
          notes: null,
        },
      ];

      const verified = EvidenceVerifier.verifyEvidence({
        requirements,
        risks,
        extractedText: documentText,
        pageCount: 3,
      });

      expect(verified.summary.confirmedEvidences).toBe(1);
      expect(verified.summary.hallucinatedExcerptsFixed).toBe(0);
      expect(verified.requirements[0]?.status).toBe('extracted');
      expect(verified.requirements[0]?.confidence).toBe('high');
      expect(verified.requirements[0]?.page).toBe(2);
    });

    it('detecta citação alucinada que não consta no texto e rebaixa preventivamente para "inferred"', () => {
      const requirements: Requirement[] = [
        {
          id: 'req-fake',
          category: 'qualificacao_economico_financeira',
          title: 'Garantia Bancária de 10%',
          description: 'Exigência de caução bancária prévia.',
          status: 'extracted',
          sourceDocument: 'edital.pdf',
          page: 2,
          section: null,
          textExcerpt: 'Exige-se depósito recursal de 10 por cento no Banco do Brasil até amanhã', // Não existe no texto
          confidence: 'high',
          notes: null,
        },
      ];

      const verified = EvidenceVerifier.verifyEvidence({
        requirements,
        risks: [],
        extractedText: documentText,
        pageCount: 3,
      });

      expect(verified.summary.confirmedEvidences).toBe(0);
      expect(verified.summary.hallucinatedExcerptsFixed).toBe(1);
      expect(verified.requirements[0]?.status).toBe('inferred'); // Rebaixado
      expect(verified.requirements[0]?.confidence).toBe('low'); // Confiança rebaixada
      expect(verified.requirements[0]?.notes).toContain('Aviso de Auditoria');
      expect(verified.requirements[0]?.notes).toContain('não foi localizado literalmente');
    });

    it('reclassifica requisito sem trecho textual citado para "inferred"', () => {
      const requirements: Requirement[] = [
        {
          id: 'req-sem-trecho',
          category: 'visita_tecnica',
          title: 'Visita Técnica Facultativa',
          description: 'Declaração de conhecimento dos locais.',
          status: 'extracted',
          sourceDocument: null,
          page: null,
          section: null,
          textExcerpt: null, // Ausência de trecho
          confidence: 'high',
          notes: null,
        },
      ];

      const verified = EvidenceVerifier.verifyEvidence({
        requirements,
        risks: [],
        extractedText: documentText,
        pageCount: 3,
      });

      expect(verified.requirements[0]?.status).toBe('inferred');
      expect(verified.requirements[0]?.notes).toContain('ausência de citação textual direta');
    });

    it('corrige páginas que excedem o limite real do documento', () => {
      const requirements: Requirement[] = [
        {
          id: 'req-pag-alta',
          category: 'objeto',
          title: 'Objeto',
          description: 'Limpeza predial',
          status: 'extracted',
          sourceDocument: 'edital.pdf',
          page: 99, // Excede pageCount=3
          section: null,
          textExcerpt: 'Contratação de serviços de limpeza e conservação predial',
          confidence: 'high',
          notes: null,
        },
      ];

      const verified = EvidenceVerifier.verifyEvidence({
        requirements,
        risks: [],
        extractedText: documentText,
        pageCount: 3,
      });

      expect(verified.requirements[0]?.page).toBeLessThanOrEqual(3);
      expect(verified.requirements[0]?.notes).toContain('excede o total de páginas');
    });
  });

  describe('MockAIProvider — Simulação de Falhas e Resiliência', () => {
    it('simula erro de timeout quando configurado', async () => {
      const provider = new MockAIProvider({ failureMode: 'timeout' });
      await expect(
        provider.generateStructured(
          { taskType: 'document.requirements_extraction', model: 'mock', messages: [] },
          tenderRequirementsExtractionSchema,
        ),
      ).rejects.toThrow(/Timeout simulado/);
    });

    it('simula erro 429 de Rate Limit quando configurado', async () => {
      const provider = new MockAIProvider({ failureMode: 'rate_limit_429' });
      await expect(
        provider.generateStructured(
          { taskType: 'document.requirements_extraction', model: 'mock', messages: [] },
          tenderRequirementsExtractionSchema,
        ),
      ).rejects.toThrow(/status 429/);
    });

    it('simula erro 503 de indisponibilidade temporária quando configurado', async () => {
      const provider = new MockAIProvider({ failureMode: 'temporary_503' });
      await expect(
        provider.generateStructured(
          { taskType: 'document.requirements_extraction', model: 'mock', messages: [] },
          tenderRequirementsExtractionSchema,
        ),
      ).rejects.toThrow(/status 503/);
    });

    it('simula JSON malformado quando configurado', async () => {
      const provider = new MockAIProvider({ failureMode: 'malformed_json' });
      await expect(
        provider.generateStructured(
          { taskType: 'document.requirements_extraction', model: 'mock', messages: [] },
          tenderRequirementsExtractionSchema,
        ),
      ).rejects.toThrow(/não retornou JSON válido/);
    });

    it('simula modo sem evidências diretas quando configurado', async () => {
      const provider = new MockAIProvider({ failureMode: 'no_evidences' });
      const result = await provider.generateStructured(
        { taskType: 'document.requirements_extraction', model: 'mock', messages: [] },
        tenderRequirementsExtractionSchema,
      );
      expect(result.data.requirements.every((r) => r.status === 'inferred')).toBe(true);
      expect(result.data.requirements.every((r) => r.textExcerpt === null)).toBe(true);
    });
  });

  describe('AIModelRouter — Fallback e Degradação Suave', () => {
    it('aciona provedor secundário de contingência quando o primário responde 429 ou 503', async () => {
      const failingPrimary = new MockAIProvider({ failureMode: 'rate_limit_429' });
      // Sobrescreve o ID para simular o provedor primário com falha
      (failingPrimary as any).id = 'primary-failing';

      const healthyFallback = new MockAIProvider({ failureMode: 'none' });
      (healthyFallback as any).id = 'fallback-healthy';

      const router = new AIModelRouter([failingPrimary, healthyFallback]);

      process.env.AI_DEFAULT_PROVIDER = 'primary-failing';
      process.env.AI_FALLBACK_PROVIDER = 'fallback-healthy';
      process.env.AI_FALLBACK_MODEL = 'mock-brief-v1';

      const result = await router.executeWithFallback(
        'document.requirements_extraction',
        { messages: [{ role: 'user', content: 'Teste de failover' }] },
        tenderRequirementsExtractionSchema,
      );

      expect(result.provider).toBe('fallback-healthy');
      expect(result.data.requirements.length).toBeGreaterThan(0);
    });
  });
});
