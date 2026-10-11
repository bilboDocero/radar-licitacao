# Fonte PNCP

Origem homologada: https://pncp.gov.br. [Swagger oficial](https://pncp.gov.br/api/consulta/swagger-ui/index.html), [OpenAPI oficial](https://pncp.gov.br/api/consulta/v3/api-docs).

Consulta realizada com datas yyyyMMdd, modalidade obrigatória, página e tamanho máximo 50. Apenas modalidades 6 e 8 estão habilitadas nesta entrega. Não se afirma cobertura nacional integral nem atualização em tempo real. Timestamps sem offset são interpretados em Brasília (UTC−03:00). URL pública do edital é construída a partir de CNPJ, ano e sequencial oficiais.

O conector não presume que endereço da unidade administrativa seja local de execução; campos de execução ficam nulos quando não informados. Referências IBGE são códigos, não nomes livres.
