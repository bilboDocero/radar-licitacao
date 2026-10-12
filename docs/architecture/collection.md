# Coleta compartilhada

SourceConnector produz um AsyncIterable de registros brutos, sem conhecer tenants. O conector PNCP usa endpoint de atualização, modalidades 6 (pregão eletrônico) e 8 (dispensa), 50 itens por página, intervalo mínimo de um segundo, timeout de 30 segundos e quatro tentativas com backoff. Cada job tem até três tentativas.

A primeira janela é configurada por PNCP_LOOKBACK_DAYS (dois dias por padrão). O cursor só avança após sucesso completo. Reexecuções sobrepõem um dia para reduzir perdas em mudanças próximas da fronteira. Isso não é um backfill integral. A coleta de alterações de prazo/situação utiliza `/contratacoes/atualizacao`.

O hash canônico ignora ordem de propriedades. O payload bruto tem hash próprio. Mesma versão não cria novos eventos; versão mais antiga não sobrescreve uma atual. Cada alteração mantém snapshot e vínculo com o raw. Falhas ficam em collection_runs, não são escondidas como coleta vazia.

Agendamento é opt-in (`COLLECTION_ENABLED=true`); manual via `pnpm collect`, com collector rodando. URLs fixas no código, HTTPS, origem exata e redirects proibidos. Sugestões de portais jamais viram requests. Novas fontes precisam de revisão de acesso, DNS público, redirects e rate limit; não há crawler genérico liberado.

Crawlee, Cheerio e Playwright estão instalados para conectores homologados futuros. A API oficial PNCP usa fetch porque não exige crawling HTML. Não se contornam CAPTCHA, autenticação ou restrições. PDFs, itens detalhados, categorias extraídas e OCR estão pendentes.

## Evolução documental planejada

O collector atual não consulta a listagem de arquivos da contratação. A próxima entrega preservará a coleta leve de metadados e descobrirá documentos somente quando houver solicitação autorizada de análise. O componente de documentos PNCP usará CNPJ, ano e sequencial para inventariar anexos; download e extração ocorrerão em processamento dedicado, sem bloquear a coleta ou o matching.

Integração PDF textual está no [escopo mínimo documental](../roadmap/document-analysis-mvp.md); OCR e formatos complexos são posteriores. Alterações no conjunto de documentos precisam ser detectadas independentemente do hash dos metadados da contratação.
