# API v1

Swagger: http://localhost:4000/api/docs. JSON: http://localhost:4000/api/docs-json. Schemas de entrada são gerados dos mesmos validadores Zod usados pela API. Recursos privados recebem `Authorization: Bearer <access_token>`; recursos da empresa exigem também `X-Organization-Id`, validado por associação. O navegador usa `/api/backend/*` para manter tokens no servidor.

Rotas públicas: GET health, plans, sources, geography. Fluxo básico: GET identity/me → POST organizations → POST profiles → GET matches/procurements → PUT favorites/:id. Administração exige role realm `platform-admin`. Vínculos de parceiro não concedem acesso à empresa.

Erros: `{ "error": { "status": 400, "message": "Dados inválidos", "issues": [], "correlationId": "..." } }`. A resposta do BFF adapta isso ao erro HTTP do Nuxt. Não exponha tokens ao copiar exemplos.
