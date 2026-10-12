import type { z } from 'zod';
import type { AIProvider, AIPromptRequest, AIProviderResponse } from './ai-provider.interface.js';
import type {
  ProcurementAIAnalysis,
  OpportunityBrief,
  Requirement,
  RiskItem,
} from '@radar/contracts';

export class MockAIProvider implements AIProvider {
  readonly id = 'mock';
  readonly name = 'Mock Deterministic AI Provider';

  isConfigured(): boolean {
    return true;
  }

  async generateStructured<T>(
    request: AIPromptRequest,
    schema: z.ZodType<T>,
  ): Promise<AIProviderResponse<T>> {
    const start = Date.now();
    const promptCombined = request.messages.map((m) => m.content).join('\n');

    let outputObj: unknown;

    if (request.taskType === 'document.requirements_extraction') {
      const isOffice = /impressora|computador|papel|escritorio|suprimento/i.test(promptCombined);
      const isEngineering = /obra|construcao|reforma|engenharia|ponte/i.test(promptCombined);

      const requirements: Requirement[] = [
        {
          id: 'req-obj-01',
          category: 'objeto',
          title: 'Objeto da Contratação',
          description: isOffice
            ? 'Aquisição de suprimentos de tecnologia e equipamentos de escritório conforme especificações do termo de referência.'
            : isEngineering
              ? 'Contratação de serviços de engenharia e obras civis conforme projeto básico anexo.'
              : 'Fornecimento de bens e serviços comuns especificados no edital.',
          status: 'extracted',
          sourceDocument: 'edital.pdf',
          page: 1,
          section: '1. Do Objeto',
          textExcerpt: 'Constitui objeto deste certame a contratação de empresa especializada...',
          confidence: 'high',
          notes: 'Objeto verificado diretamente no preâmbulo do edital.',
        },
        {
          id: 'req-hab-01',
          category: 'habilitacao_juridica',
          title: 'Registro Comercial e Contrato Social',
          description:
            'Apresentação de contrato social em vigor registrado na Junta Comercial competente.',
          status: 'extracted',
          sourceDocument: 'edital.pdf',
          page: 4,
          section: '4. Da Habilitação',
          textExcerpt: 'Registro comercial, no caso de empresa individual, ou ato constitutivo...',
          confidence: 'high',
          notes: 'Exigência legal padrão conforme art. 66 da Lei 14.133/2021.',
        },
        {
          id: 'req-tec-01',
          category: 'atestados_capacidade',
          title: 'Atestado de Capacidade Técnica',
          description:
            'Comprovação de aptidão técnica por meio de ao menos 1 atestado emitido por pessoa jurídica de direito público ou privado.',
          status: 'extracted',
          sourceDocument: 'termo_referencia.pdf',
          page: 7,
          section: '7. Da Qualificação Técnica',
          textExcerpt:
            'Comprovação de fornecimento compatível em características e prazos com o objeto.',
          confidence: 'high',
          notes: 'Exigência de pertinência técnica com o objeto cotado.',
        },
        {
          id: 'req-imp-01',
          category: 'esclarecimento_impugnacao',
          title: 'Prazo para Impugnação',
          description: 'Pedidos de esclarecimento ou impugnação em até 3 dias úteis antes da data de abertura.',
          status: 'extracted',
          sourceDocument: 'edital.pdf',
          page: 2,
          section: '2. Dos Esclarecimentos e Impugnações',
          textExcerpt:
            'Qualquer pessoa poderá impugnar os termos do edital em até 3 (três) dias úteis antes da abertura.',
          confidence: 'high',
          notes: 'Prazo em conformidade estrita com o art. 164 da Lei 14.133/2021.',
        },
      ];

      const risks: RiskItem[] = [
        {
          description:
            'Prazo estrito para entrega inicial em até 10 dias úteis após assinatura da nota de empenho.',
          severity: 'medium',
          sourceDocument: 'termo_referencia.pdf',
          page: 9,
          textExcerpt: 'O prazo de entrega dos itens é de 10 dias corridos...',
          notes: 'Exige planejamento de estoque e logística para pronta entrega.',
        },
        {
          description:
            'Multa moratória de 0,5% ao dia sobre o valor da nota de empenho por atraso não justificado.',
          severity: 'low',
          sourceDocument: 'edital.pdf',
          page: 12,
          textExcerpt: 'Atrasos ensejarão aplicação de multa de mora calculada sobre o saldo...',
          notes: 'Cláusula penal padrão da administração.',
        },
      ];

      const analysis: Partial<ProcurementAIAnalysis> = {
        procurementId: '00000000-0000-0000-0000-000000000000',
        version: 1,
        status: 'COMPLETED',
        model: request.model,
        provider: this.id,
        promptVersion: '1.0.0',
        summary: isOffice
          ? 'Pregão para fornecimento de equipamentos e suprimentos com exigência de atestado simples e prazo aberto.'
          : 'Edital de compras governamentais processado com requisitos estruturados e evidências rastreáveis.',
        executionPlace: {
          state: 'SP',
          municipality: '3550308',
          details: 'Entrega na sede do almoxarifado central.',
        },
        requirements,
        risks,
        unverifiedPoints: [
          'Possibilidade de subcontratação não especificada no edital.',
          'Índices de liquidez financeira exigidos dependem de balanço patrimonial recente.',
        ],
        analyzedAt: new Date().toISOString(),
      };
      outputObj = analysis;
    } else if (request.taskType === 'opportunity.brief_generation') {
      const brief: Partial<OpportunityBrief> = {
        organizationId: '00000000-0000-0000-0000-000000000000',
        procurementId: '00000000-0000-0000-0000-000000000000',
        profileId: '00000000-0000-0000-0000-000000000000',
        status: 'COMPLETED',
        summary:
          'Oportunidade de alta compatibilidade comercial com o portfólio cadastrado. Documentação de habilitação acessível e prazo adequado para preparação da proposta.',
        commercialFit: {
          score: 85,
          level: 'high',
          matchingReasons: [
            'Palavras-chave encontradas no objeto principal do edital.',
            'Área de cobertura geográfica perfeitamente atendida pela sede operacional.',
            'Exigências técnicas compatíveis com empresas de pequeno e médio porte.',
          ],
          geographicFit: {
            basis: 'execution',
            compatible: true,
            explanation:
              'Local de entrega compatível com a cobertura comercial configurada na organização.',
          },
          strengths: [
            'Atendimento integral aos requisitos técnicos declarados.',
            'Disponibilidade de certidões e regularidade fiscal padrão.',
          ],
          gaps: [
            'Verificar capacidade de logística para cumprimento do prazo de entrega de 10 dias.',
          ],
        },
        keyRequirements: [
          {
            id: 'brief-req-1',
            category: 'habilitacao_juridica',
            title: 'Habilitação Jurídica e Fiscal',
            description: 'Certidões negativas da Receita Federal, FGTS e CNDT válidas.',
            status: 'extracted',
            sourceDocument: 'edital.pdf',
            page: 4,
            section: '4. Da Habilitação',
            textExcerpt: 'Regularidade fiscal e trabalhista...',
            confidence: 'high',
            notes: 'Exigência mandatória da Lei 14.133/2021.',
          },
        ],
        risksAndCautions: [
          {
            description:
              'Atenção ao prazo limite de impugnação do edital (3 dias úteis antes da abertura).',
            severity: 'medium',
            sourceDocument: 'edital.pdf',
            page: 2,
            textExcerpt: null,
            notes: 'Fique atento ao prazo caso haja divergência técnica.',
          },
        ],
        unverifiedInformation: ['Local exato de descarga no almoxarifado não detalhado no edital.'],
        suggestedNextSteps: [
          '1. Baixar o edital completo e o termo de referência no portal oficial.',
          '2. Validar validade das certidões negativas (CNDT, FGTS, Tributos Federais).',
          '3. Elaborar proposta de preços com margem e custos logísticos embutidos.',
          '4. Cadastrar proposta no sistema de compras antes do prazo de encerramento.',
        ],
        officialLinks: [
          { label: 'Portal Nacional de Contratações Públicas', url: 'https://pncp.gov.br' },
        ],
        analyzedAt: new Date().toISOString(),
        disclaimer:
          'Análise informativa preliminar automatizada por inteligência artificial. Não constitui parecer jurídico nem garantia de habilitação.',
      };
      outputObj = brief;
    } else {
      outputObj = {
        classification: 'compras_publicas',
        confidence: 'high',
        summary: 'Classificação gerada via Mock AI Provider.',
      };
    }

    const parsed = schema.parse(outputObj);
    const latencyMs = Math.max(1, Date.now() - start);

    return {
      provider: this.id,
      model: request.model,
      data: parsed,
      rawText: JSON.stringify(outputObj),
      inputTokens: Math.ceil(promptCombined.length / 4),
      outputTokens: Math.ceil(JSON.stringify(outputObj).length / 4),
      totalTokens: Math.ceil((promptCombined.length + JSON.stringify(outputObj).length) / 4),
      latencyMs,
      costUsd: 0,
    };
  }
}
