# ADR 0007 — Análise documental sob demanda com evidências

Data: 12/10/2026. Estado: implementado e validado. Complementa e delimita a [ADR 0006](0006-document-intelligence.md).

## Contexto

O Gemini já processa metadados reais, mas descoberta de anexos e extração PDF não estão conectadas ao analisador. A documentação anterior confundia capacidades auxiliares implementadas com o fluxo documental completo. O MVP precisa produzir informação útil sem multiplicar inferências por assinante ou bloquear o matching.

## Decisão

Entregar um resumo de decisão com cinco blocos e evidências, conforme [escopo e critérios de aceite](../roadmap/document-analysis-mvp.md). Processar edital e termo de referência em PDF textual, inicialmente sob demanda autorizada, por fila de inteligência com concorrência e orçamento controlados.

Compartilhar a análise pública por identidade documental e configuração do pipeline. Personalizar o brief separadamente, isolado por empresa/perfil. Mostrar cobertura e pendências; inferências, trechos não localizados e falhas de leitura não podem aparecer como fatos confirmados. Não usar mock como fallback operacional.

Reutilizar o monorepo e os serviços existentes. OCR, anexos complexos, chat e comprovação de habilitação ficam fora da primeira entrega. Limites quantitativos, retenção dos arquivos e critérios numéricos de qualidade serão definidos com uma amostra medida antes da liberação.

## Consequências

- Ajustar o enriquecimento automático atual do worker ao modo sob demanda deste incremento.
- Implementar inventário PNCP, identidade do conjunto documental, estado de execução/cobertura e atualização do resultado.
- Fortalecer download, extração e validação de evidências antes de processar PDFs externos.
- Expandir o cache atual, que considera versão da licitação/provedor/modelo/prompt, para incluir documentos/hashes e versões de extrator/schema.
- Consulta repetida não deve produzir nova inferência; reanálise exige mudança relevante ou ação explícita com controle de frequência.
- Esta ADR não afirma que a integração PDF, uma fila dedicada ou limites de orçamento concorrente já estejam implementados.
