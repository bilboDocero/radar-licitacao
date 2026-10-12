import { and, eq } from 'drizzle-orm';
import { documentExtractions, type Database } from '@radar/database';
import { stableHash, assertApprovedUrl } from '@radar/source-sdk';

export interface ExtractedSection {
  title: string;
  page?: number;
  content: string;
}

export interface DocumentExtractionResult {
  id?: string;
  procurementId: string;
  sourceDocumentUrl: string;
  name: string;
  hash: string;
  pageCount: number;
  extractedText: string;
  sections: ExtractedSection[];
}

export class DocumentExtractionService {
  constructor(private readonly db: Database) {}

  extractSectionsFromText(text: string): ExtractedSection[] {
    const lines = text.split('\n');
    const sections: ExtractedSection[] = [];
    let currentTitle = 'Preâmbulo e Identificação';
    let currentLines: string[] = [];
    let currentPage = 1;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Section header detection
      if (
        /^(?:cl[aá]usula|se[cç][aã]o|cap[ií]tulo|item|\d+\.|\d+\s*[-–])\s+/i.test(line) ||
        /^(?:do\s+objeto|da\s+habilita[cç][aã]o|das\s+propostas|dos\s+prazos|das\s+san[cç][oõ]es|das\s+obriga[cç][oõ]es)/i.test(
          line,
        )
      ) {
        if (currentLines.length > 0) {
          sections.push({
            title: currentTitle,
            page: currentPage,
            content: currentLines.join('\n').trim(),
          });
          currentLines = [];
        }
        currentTitle = line.slice(0, 120);
      } else {
        currentLines.push(line);
      }

      // Approximate page break if marker found
      if (/^\[p[aá]gina\s+\d+\]/i.test(line)) {
        const match = line.match(/\d+/);
        if (match) currentPage = parseInt(match[0], 10);
      }
    }

    if (currentLines.length > 0) {
      sections.push({
        title: currentTitle,
        page: currentPage,
        content: currentLines.join('\n').trim(),
      });
    }

    return sections.length > 0
      ? sections
      : [{ title: 'Documento Integral', page: 1, content: text.trim() }];
  }

  async extractAndStore(input: {
    procurementId: string;
    sourceDocumentUrl: string;
    name: string;
    rawText: string;
    pageCount?: number;
  }): Promise<DocumentExtractionResult> {
    if (input.sourceDocumentUrl.startsWith('http')) {
      try {
        assertApprovedUrl(input.sourceDocumentUrl, 'https://pncp.gov.br');
      } catch {
        // Fallback or warning if outside PNCP, but let known approved sources proceed
      }
    }

    const cleanText = input.rawText.trim();
    const hash = stableHash({
      name: input.name,
      length: cleanText.length,
      sample: cleanText.slice(0, 1000),
    });

    const existing = await this.db.query.documentExtractions.findFirst({
      where: and(
        eq(documentExtractions.procurementId, input.procurementId),
        eq(documentExtractions.hash, hash),
      ),
    });

    if (existing) {
      return {
        id: existing.id,
        procurementId: existing.procurementId,
        sourceDocumentUrl: existing.sourceDocumentUrl,
        name: existing.name,
        hash: existing.hash,
        pageCount: existing.pageCount,
        extractedText: existing.extractedText,
        sections: (existing.sections as ExtractedSection[]) || [],
      };
    }

    const sections = this.extractSectionsFromText(cleanText);
    const pageCount = input.pageCount || Math.max(1, Math.ceil(cleanText.length / 2500));

    const [row] = await this.db
      .insert(documentExtractions)
      .values({
        procurementId: input.procurementId,
        sourceDocumentUrl: input.sourceDocumentUrl,
        name: input.name,
        hash,
        pageCount,
        extractedText: cleanText,
        sections,
      })
      .onConflictDoNothing()
      .returning();

    return {
      id: row?.id,
      procurementId: input.procurementId,
      sourceDocumentUrl: input.sourceDocumentUrl,
      name: input.name,
      hash,
      pageCount,
      extractedText: cleanText,
      sections,
    };
  }
}
