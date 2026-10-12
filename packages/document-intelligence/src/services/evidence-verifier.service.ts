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

      // Se a IA informou uma página maior que o total do documento ou menor que 1
      if (cloned.page !== null && (cloned.page > pageCount || cloned.page < 1)) {
        cloned.notes = `${cloned.notes ? `${cloned.notes} · ` : ''}Página citada (${cloned.page}) excede o total de páginas (${pageCount}).`;
        cloned.page = Math.min(Math.max(1, cloned.page), pageCount);
      }

      // Se não há trecho citado, não pode ser classificado como 'extracted' (fato diretamente evidenciado)
      if (!cloned.textExcerpt || cloned.textExcerpt.trim().length < 8) {
        if (cloned.status === 'extracted') {
          cloned.status = 'inferred';
          cloned.confidence = 'medium';
          cloned.notes = `${cloned.notes ? `${cloned.notes} · ` : ''}Reclassificado para inferência por ausência de citação textual direta comprobatória.`;
          inferredCount++;
        }
        return cloned;
      }

      const normalizedExcerpt = normalizeForComparison(cloned.textExcerpt);

      // 1. Procura se a citação completa e substancial existe no documento extraído
      // Não aceita prefixo arbitrário curto de 35 caracteres
      const existsInDocument =
        normalizedFullText.includes(normalizedExcerpt) ||
        (normalizedExcerpt.length > 80 &&
          normalizedFullText.includes(normalizedExcerpt.slice(0, Math.floor(normalizedExcerpt.length * 0.85))));

      if (existsInDocument) {
        // 2. Localiza a página real onde o trecho ocorre entre as seções extraídas
        let foundPage: number | null = null;
        for (const sec of sections) {
          const normSec = normalizeForComparison(sec.content);
          if (normSec.includes(normalizedExcerpt) || (normalizedExcerpt.length > 80 && normSec.includes(normalizedExcerpt.slice(0, Math.floor(normalizedExcerpt.length * 0.85))))) {
            foundPage = sec.startPage;
            break;
          }
        }

        cloned.status = 'extracted';
        cloned.confidence = 'high';

        if (foundPage !== null) {
          if (cloned.page !== null && cloned.page !== foundPage) {
            cloned.notes = `${cloned.notes ? `${cloned.notes} · ` : ''}Aviso de Auditoria: Trecho localizado na página ${foundPage}, divergindo da página ${cloned.page} indicada pela IA.`;
          }
          cloned.page = foundPage;
        }

        confirmedCount++;
      } else {
        // Citação textual da IA NÃO encontrada no documento extraído (alucinação de citação)
        cloned.status = 'inferred';
        cloned.confidence = 'low';
        cloned.notes = `${cloned.notes ? `${cloned.notes} · ` : ''}Aviso de Auditoria: Trecho citado ("${cloned.textExcerpt.slice(0, 60)}...") não foi localizado literalmente nos documentos analisados. Reclassificado preventivamente como inferência.`;
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
          clonedRisk.notes = `${clonedRisk.notes ? `${clonedRisk.notes} · ` : ''}Aviso de Auditoria: Trecho de evidência citado não localizado nos documentos analisados.`;
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
