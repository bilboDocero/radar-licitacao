import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { documentExtractions, type Database } from '@radar/database';
import {
  stableHash,
  safeDownloadFile,
  type SafeDownloadOptions,
  type SafeDownloadResult,
} from '@radar/source-sdk';
import { extractText } from 'unpdf';
import { logger } from '@radar/config';

export interface ExtractedSection {
  id: string;
  order: number;
  title: string;
  startPage: number;
  endPage: number;
  content: string;
  contentHash: string;
  estimatedTokens: number;
}

export interface DocumentExtractionResult {
  id?: string;
  procurementId: string;
  sourceDocumentUrl: string;
  name: string;
  documentHash: string; // SHA-256 dos bytes do arquivo
  extractedTextHash: string; // SHA-256 do texto extraído normalizado
  pageCount: number;
  unreadablePages: number[]; // Páginas vazias / digitalizadas que demandam OCR
  extractedText: string;
  sections: ExtractedSection[];
  isPdf: boolean;
}

export class DocumentExtractionService {
  constructor(private readonly db: Database) {}

  /**
   * Extrai texto página por página a partir de um buffer, com suporte nativo a PDF.
   */
  async extractTextFromBuffer(
    buffer: Buffer,
    fileName = 'documento.pdf',
  ): Promise<{ text: string; pageCount: number; unreadablePages: number[]; isPdf: boolean }> {
    const isPdf =
      buffer.length >= 5 &&
      (buffer.subarray(0, 5).toString('ascii') === '%PDF-' || fileName.toLowerCase().endsWith('.pdf'));

    if (isPdf) {
      try {
        const uint8Array = new Uint8Array(buffer);
        const { totalPages, text: pages } = await extractText(uint8Array, { mergePages: false });

        const unreadablePages: number[] = [];
        const formattedPages: string[] = [];

        pages.forEach((pageContent, idx) => {
          const pageNum = idx + 1;
          const cleanPageText = (pageContent || '').trim();
          if (cleanPageText.length < 15) {
            // Menos de 15 caracteres indica página em branco ou imagem escaneada sem OCR
            unreadablePages.push(pageNum);
          }
          formattedPages.push(`[Página ${pageNum}]\n${cleanPageText}`);
        });

        const fullText = formattedPages.join('\n\n');
        return {
          text: fullText,
          pageCount: totalPages,
          unreadablePages,
          isPdf: true,
        };
      } catch (pdfErr) {
        logger.warn({ err: pdfErr, fileName }, 'Falha no parser de PDF; tentando fallback para decodificação UTF-8');
      }
    }

    // Fallback para arquivo textual puro (TXT, HTML, JSON)
    const text = buffer.toString('utf-8');
    const pageCount = Math.max(1, Math.ceil(text.length / 2500));
    return {
      text,
      pageCount,
      unreadablePages: [],
      isPdf: false,
    };
  }

  /**
   * Segmentação temática avançada com metadados estruturados de chunking (ordem, hash, tokens e páginas).
   */
  extractSectionsFromText(text: string): ExtractedSection[] {
    const lines = text.split('\n');
    const sections: ExtractedSection[] = [];
    let currentTitle = 'Preâmbulo e Identificação';
    let currentLines: string[] = [];
    let startPage = 1;
    let currentPage = 1;
    let order = 1;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Detecção de marcador explícito de página
      const pageMatch = line.match(/^\[Página\s+(\d+)\]/i);
      if (pageMatch && pageMatch[1]) {
        currentPage = parseInt(pageMatch[1], 10);
      }

      // Detecção de títulos e seções normativas de editais
      const isHeader =
        /^(?:cl[aá]usula|se[cç][aã]o|cap[ií]tulo|item|\d+\.|\d+\s*[-–])\s+/i.test(line) ||
        /^(?:do\s+objeto|da\s+habilita[cç][aã]o|das\s+propostas|dos\s+prazos|das\s+san[cç][oõ]es|das\s+obriga[cç][oõ]es|da\s+qualifica[cç][aã]o|dos\s+crit[eé]rios|dos\s+recursos|do\s+pagamento)/i.test(
          line,
        );

      if (isHeader) {
        if (currentLines.length > 0) {
          const content = currentLines.join('\n').trim();
          sections.push({
            id: `sec-${String(order).padStart(2, '0')}`,
            order: order++,
            title: currentTitle,
            startPage,
            endPage: currentPage,
            content,
            contentHash: createHash('sha256').update(content).digest('hex'),
            estimatedTokens: Math.ceil(content.length / 4),
          });
          currentLines = [];
        }
        currentTitle = line.slice(0, 120);
        startPage = currentPage;
      } else {
        currentLines.push(line);
      }
    }

    if (currentLines.length > 0) {
      const content = currentLines.join('\n').trim();
      sections.push({
        id: `sec-${String(order).padStart(2, '0')}`,
        order,
        title: currentTitle,
        startPage,
        endPage: currentPage,
        content,
        contentHash: createHash('sha256').update(content).digest('hex'),
        estimatedTokens: Math.ceil(content.length / 4),
      });
    }

    return sections.length > 0
      ? sections
      : [
          {
            id: 'sec-01',
            order: 1,
            title: 'Documento Integral',
            startPage: 1,
            endPage: currentPage,
            content: text.trim(),
            contentHash: createHash('sha256').update(text.trim()).digest('hex'),
            estimatedTokens: Math.ceil(text.trim().length / 4),
          },
        ];
  }

  /**
   * Pipeline completo: Baixa o documento com segurança SSRF, extrai texto/páginas de PDF e persiste com metadados.
   */
  async downloadAndExtract(input: {
    procurementId: string;
    sourceDocumentUrl: string;
    fileName?: string;
    downloadOptions?: SafeDownloadOptions;
  }): Promise<DocumentExtractionResult> {
    const fileName = input.fileName || 'edital.pdf';

    // 1. Download seguro protegido contra SSRF, DNS rebinding e limites de tamanho
    const download = await safeDownloadFile(input.sourceDocumentUrl, input.downloadOptions);

    // 2. Extração de texto preservando páginas
    const { text, pageCount, unreadablePages, isPdf } = await this.extractTextFromBuffer(
      download.buffer,
      fileName,
    );

    const extractedTextHash = createHash('sha256').update(text.trim()).digest('hex');

    // 3. Verifica cache existente pelo hash binário do documento
    const existing = await this.db.query.documentExtractions.findFirst({
      where: and(
        eq(documentExtractions.procurementId, input.procurementId),
        eq(documentExtractions.hash, download.sha256),
      ),
    });

    if (existing) {
      return {
        id: existing.id,
        procurementId: existing.procurementId,
        sourceDocumentUrl: existing.sourceDocumentUrl,
        name: existing.name,
        documentHash: existing.hash,
        extractedTextHash,
        pageCount: existing.pageCount,
        unreadablePages,
        extractedText: existing.extractedText,
        sections: (existing.sections as ExtractedSection[]) || [],
        isPdf,
      };
    }

    // 4. Segmentação temática estruturada
    const sections = this.extractSectionsFromText(text);

    // 5. Persistência
    const [row] = await this.db
      .insert(documentExtractions)
      .values({
        procurementId: input.procurementId,
        sourceDocumentUrl: input.sourceDocumentUrl,
        name: fileName,
        hash: download.sha256,
        pageCount,
        extractedText: text,
        sections,
      })
      .onConflictDoNothing()
      .returning();

    return {
      id: row?.id,
      procurementId: input.procurementId,
      sourceDocumentUrl: input.sourceDocumentUrl,
      name: fileName,
      documentHash: download.sha256,
      extractedTextHash,
      pageCount,
      unreadablePages,
      extractedText: text,
      sections,
      isPdf,
    };
  }

  /**
   * Processa texto fornecido diretamente (para testes ou fontes com texto consolidado), gerando hash e seções.
   */
  async extractAndStore(input: {
    procurementId: string;
    sourceDocumentUrl: string;
    name: string;
    rawText: string;
    pageCount?: number;
  }): Promise<DocumentExtractionResult> {
    const cleanText = input.rawText.trim();
    const documentHash = createHash('sha256').update(cleanText).digest('hex');
    const extractedTextHash = documentHash;

    const existing = await this.db.query.documentExtractions.findFirst({
      where: and(
        eq(documentExtractions.procurementId, input.procurementId),
        eq(documentExtractions.hash, documentHash),
      ),
    });

    if (existing) {
      return {
        id: existing.id,
        procurementId: existing.procurementId,
        sourceDocumentUrl: existing.sourceDocumentUrl,
        name: existing.name,
        documentHash: existing.hash,
        extractedTextHash,
        pageCount: existing.pageCount,
        unreadablePages: [],
        extractedText: existing.extractedText,
        sections: (existing.sections as ExtractedSection[]) || [],
        isPdf: false,
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
        hash: documentHash,
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
      documentHash,
      extractedTextHash,
      pageCount,
      unreadablePages: [],
      extractedText: cleanText,
      sections,
      isPdf: false,
    };
  }
}
