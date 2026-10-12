import type { Requirement, RiskItem } from '@radar/contracts';
import type { ExtractedSection } from './document-extraction.service.js';

export interface VerificationSummary {
  totalRequirements: number;
  confirmedEvidences: number;
  inferredOrUnverified: number;
  hallucinatedExcerptsFixed: number;
  evidenceAccuracyPercentage: number;
}

export interface VerifiedAnalysisResult {
  requirements: Requirement[];
  risks: RiskItem[];
  summary: VerificationSummary;
}

/**
 * Normaliza texto para busca insensível a quebras de linha múltiplas, pontuação e acentos.
 */
function normalizeForComparison(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s\r\n\t]+/g, ' ')
    .replace(/[“”"']/g, '')
    .trim();
}

export class EvidenceVerifier {
  /**
   * Verifica determinística e rigorosamente se os trechos e páginas citados pela IA
   * existem de fato no texto bruto extraído do edital.
   */
  static verifyEvidence(input: {
    requirements: Requirement[];
    risks: RiskItem[];
    extractedText: string;
    sections?: ExtractedSection[];
    pageCount?: number;
  }): VerifiedAnalysisResult {
    const { requirements, risks, extractedText, sections = [], pageCount = 1 } = input;
    const normalizedFullText = normalizeForComparison(extractedText);

    let confirmedCount = 0;
    let inferredCount = 0;
    let fixedExcerptsCount = 0;

    const verifiedRequirements = requirements.map((req) => {
      const cloned: Requirement = { ...req };

      // Se a IA informou uma página maior que o total do documento, ajusta
      if (cloned.page && (cloned.page > pageCount || cloned.page < 1)) {
        cloned.notes = `${cloned.notes ? `${cloned.notes} · ` : ''}Página citada (${cloned.page}) excede o total de páginas (${pageCount}).`;
        cloned.page = Math.min(Math.max(1, cloned.page), pageCount);
      }

      // Se não há trecho citado, não pode ser classificado como 'extracted' (fato diretamente extraído)
      if (!cloned.textExcerpt || cloned.textExcerpt.trim().length < 5) {
        if (cloned.status === 'extracted') {
          cloned.status = 'inferred';
          cloned.confidence = 'medium';
          cloned.notes = `${cloned.notes ? `${cloned.notes} · ` : ''}Reclassificado para inferência por ausência de citação textual direta.`;
          inferredCount++;
        }
        return cloned;
      }

      const normalizedExcerpt = normalizeForComparison(cloned.textExcerpt);

      // 1. Procura se o trecho existe no documento completo
      const existsInDocument =
        normalizedFullText.includes(normalizedExcerpt) ||
        (normalizedExcerpt.length > 40 &&
          normalizedFullText.includes(normalizedExcerpt.slice(0, 35)));

      if (existsInDocument) {
        // 2. Tenta localizar a página real onde o trecho ocorre entre as seções
        let realPage = cloned.page;
        for (const sec of sections) {
          const normSec = normalizeForComparison(sec.content);
          if (
            normSec.includes(normalizedExcerpt) ||
            (normalizedExcerpt.length > 40 && normSec.includes(normalizedExcerpt.slice(0, 35)))
          ) {
            realPage = sec.startPage;
            break;
          }
        }

        cloned.status = 'extracted';
        cloned.confidence = 'high';
        if (realPage && realPage !== cloned.page) {
          cloned.page = realPage;
        }
        confirmedCount++;
      } else {
        // Trecho citado pela LLM NÃO consta no documento extraído (alucinação de citação)
        cloned.status = 'inferred';
        cloned.confidence = 'low';
        cloned.notes = `${cloned.notes ? `${cloned.notes} · ` : ''}Aviso de Auditoria: Trecho citado ("${cloned.textExcerpt.slice(0, 60)}...") não foi localizado literalmente no documento. Reclassificado como inferência pendente de revisão.`;
        fixedExcerptsCount++;
        inferredCount++;
      }

      return cloned;
    });

    const verifiedRisks = risks.map((risk) => {
      const clonedRisk: RiskItem = { ...risk };
      if (clonedRisk.textExcerpt && clonedRisk.textExcerpt.trim().length >= 10) {
        const normRiskExcerpt = normalizeForComparison(clonedRisk.textExcerpt);
        const exists = normalizedFullText.includes(normRiskExcerpt);
        if (!exists) {
          clonedRisk.notes = `${clonedRisk.notes ? `${clonedRisk.notes} · ` : ''}Trecho de evidência citado não localizado literalmente no edital.`;
        }
      }
      return clonedRisk;
    });

    const total = verifiedRequirements.length;
    const accuracy = total > 0 ? Math.round((confirmedCount / total) * 100) : 100;

    return {
      requirements: verifiedRequirements,
      risks: verifiedRisks,
      summary: {
        totalRequirements: total,
        confirmedEvidences: confirmedCount,
        inferredOrUnverified: inferredCount,
        hallucinatedExcerptsFixed: fixedExcerptsCount,
        evidenceAccuracyPercentage: accuracy,
      },
    };
  }
}
