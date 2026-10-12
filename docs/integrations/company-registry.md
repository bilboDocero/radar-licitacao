# Enriquecimento Cadastral Empresarial (BrasilAPI e CNPJ.ws)

Este documento especifica a arquitetura e operação do serviço de enriquecimento cadastral de organizações por CNPJ no Radar de Licitações Públicas.

---

## 1. Visão Geral e Princípios

O módulo de organizações integra-se a fontes públicas da Receita Federal do Brasil para enriquecer a tela da empresa (`/app/empresa`) com dados oficiais.

- **Fonte Primária:** [BrasilAPI](https://brasilapi.com.br/) (`GET https://brasilapi.com.br/api/cnpj/v1/{cnpj}`).
- **Fallback Controlado:** [CNPJ.ws Pública](https://publica.cnpj.ws/) (`GET https://publica.cnpj.ws/cnpj/{cnpj}`).
- **Escopo Estritamente de Leitura:** O enriquecimento é apenas visual e informativo. Não altera automaticamente o perfil comercial, CNAEs declarados pelo usuário, palavras-chave, cobertura geográfica ou qualquer algoritmo de matching.
- **Nenhuma Chamada pelo Navegador:** Todas as requisições a APIs externas ocorrem exclusivamente pelo backend NestJS (`CompanyRegistryService`), protegendo contra vazamento de IPs e mitigando problemas de CORS.

---

## 2. Contrato de Dados Normalizado (`OrganizationRegistryView`)

As respostas de ambas as fontes são convertidas no backend para o contrato único estável definido em `@radar/contracts`:

```typescript
export interface OrganizationRegistryView {
  cnpj: string;
  legalName: string | null;           // Razão Social
  tradeName: string | null;           // Nome Fantasia

  registrationStatus: string | null;  // Situação (ex: ATIVA, BAIXADA)
  openedAt: string | null;            // Data de abertura
  establishmentType: string | null;   // Matriz ou Filial

  legalNature: string | null;         // Natureza jurídica
  companySize: string | null;         // Porte da empresa
  shareCapital: string | null;        // Capital social

  primaryActivity: {
    code: string;                     // Código CNAE (7 dígitos)
    description: string;              // Descrição oficial
  } | null;

  secondaryActivities: Array<{
    code: string;
    description: string;
  }>;

  address: {
    postalCode: string | null;        // CEP
    street: string | null;            // Logradouro
    number: string | null;            // Número
    complement: string | null;        // Complemento
    neighborhood: string | null;      // Bairro
    city: string | null;              // Município
    state: string | null;             // UF
    country: string | null;           // País
  };

  email: string | null;               // E-mail público
  phone: string | null;               // Telefone comercial

  simpleTaxRegime: boolean | null;    // Optante Simples Nacional
  mei: boolean | null;                // Enquadramento MEI

  source: 'brasilapi' | 'cnpjws' | 'mock';
  fetchedAt: string;
  sourceUpdatedAt: string | null;
  isCached?: boolean;
}
```

Campos não fornecidos pela fonte são mantidos como `null`, sem criar dados fictícios.

---

## 3. Política de Cache e Resiliência

1. **Cache Redis de 7 Dias:**
   - Chave: `company_registry:{cnpj}`
   - TTL: 604.800 segundos (7 dias).
   - Consultas repetidas durante a navegação utilizam os dados em cache (`isCached: true`), sem gerar tráfego nas APIs externas.
2. **Single-Flight Concorrente:**
   - Múltiplas requisições simultâneas para a mesma empresa compartilham a mesma Promise em voo, impedindo requisições duplicadas às fontes públicas.
3. **Regras Estritas de Fallback:**
   - O fallback para CNPJ.ws é disparado **apenas** em caso de timeout (6s), falha transitória de rede ou erro HTTP 5xx na BrasilAPI.
   - Se a BrasilAPI retornar **HTTP 404 (Not Found)**, o fallback **NÃO é acionado**, evitando consumir a cota de taxa para CNPJs inexistentes.
4. **Rate Limiting no CNPJ.ws:**
   - A API pública do CNPJ.ws possui limite de 3 requisições por minuto por IP.
   - O `CnpjWsAdapter` verifica o contador compartilhado `ratelimit:cnpjws:public` no Redis antes de qualquer chamada externa. Se o limite de 3 requisições na janela de 60s for atingido, a consulta é recusada preventivamente para evitar banimento de IP.
5. **Cooldown de Atualização:**
   - Atualizações forçadas (`?refresh=true`) exigem papel `owner` ou `admin` e aplicam cooldown de 60 segundos por organização no Redis (`cooldown:org_refresh:{orgId}`).

---

## 4. Endpoints da API

### `GET /api/v1/organizations/current/registry`
- **Autenticação:** Bearer Token + `TenantGuard` (header `X-Organization-Id`).
- **Comportamento:** O CNPJ é extraído diretamente da organização autorizada no banco de dados. O endpoint não aceita CNPJ arbitrário na query/body, impedindo o uso do Radar como proxy público aberto.
- **Parâmetros de Query Opcionais:** `?refresh=true` (força consulta fresca, sujeito a cooldown).

### `PATCH /api/v1/organizations/current`
- **Autenticação:** `TenantGuard` com `@Manage()` (papéis `owner` e `admin`).
- **Body:** `{ cnpj?: string, name?: string }`
- **Comportamento:** Permite cadastrar ou atualizar o CNPJ da empresa caso não tenha sido preenchido no onboarding.

---

## 5. Smoke Test

Para validar a comunicação externa da BrasilAPI no ambiente local sem necessidade de autenticação:

```bash
corepack pnpm smoke:registry
```
