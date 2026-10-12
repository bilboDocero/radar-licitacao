import type { OrganizationRegistryView } from '@radar/contracts';
import {
  type CompanyRegistryAdapter,
  RegistryNotFoundError,
  RegistryTransientError,
  RegistryRateLimitError,
} from './company-registry.interface.js';
import { logger } from '@radar/config';

interface BrasilApiCnpjResponse {
  cnpj: string;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  situacao_cadastral?: number | null;
  descricao_situacao_cadastral?: string | null;
  data_situacao_cadastral?: string | null;
  data_inicio_atividade?: string | null;
  descricao_matriz_filial?: string | null;
  natureza_juridica?: string | null;
  descricao_porte?: string | null;
  capital_social?: number | string | null;
  cnae_fiscal?: number | string | null;
  cnae_fiscal_descricao?: string | null;
  cnaes_secundarios?: Array<{
    codigo?: number | string;
    descricao?: string;
  }> | null;
  descricao_tipo_de_logradouro?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cep?: number | string | null;
  uf?: string | null;
  municipio?: string | null;
  email?: string | null;
  ddd_telefone_1?: string | null;
  ddd_telefone_2?: string | null;
  opcao_pelo_simples?: boolean | null;
  opcao_pelo_mei?: boolean | null;
}

export class BrasilApiAdapter implements CompanyRegistryAdapter {
  readonly id = 'brasilapi' as const;

  constructor(
    private readonly baseUrl = 'https://brasilapi.com.br/api/cnpj/v1',
    private readonly timeoutMs = 6000,
  ) {}

  async fetchRegistry(cnpj: string): Promise<OrganizationRegistryView> {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      throw new Error(`CNPJ inválido para consulta: ${cnpj}`);
    }

    const url = `${this.baseUrl}/${cleanCnpj}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'RadarDeLicitacoes/1.0',
        },
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new RegistryTransientError(
          `Timeout de consulta (${this.timeoutMs}ms) na BrasilAPI`,
          this.id,
          err,
        );
      }
      throw new RegistryTransientError(
        `Falha de rede ao consultar BrasilAPI: ${err instanceof Error ? err.message : String(err)}`,
        this.id,
        err,
      );
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 404) {
      throw new RegistryNotFoundError(cleanCnpj);
    }

    if (response.status === 429) {
      throw new RegistryRateLimitError(this.id, 'Limite de consultas excedido na BrasilAPI (HTTP 429).');
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new RegistryTransientError(
        `BrasilAPI retornou HTTP ${response.status}: ${errText.slice(0, 200)}`,
        this.id,
      );
    }

    let payload: BrasilApiCnpjResponse;
    try {
      payload = (await response.json()) as BrasilApiCnpjResponse;
    } catch (err) {
      throw new RegistryTransientError(
        'BrasilAPI retornou JSON inválido',
        this.id,
        err,
      );
    }

    return this.mapToNormalized(cleanCnpj, payload);
  }

  mapToNormalized(cleanCnpj: string, data: BrasilApiCnpjResponse): OrganizationRegistryView {
    const streetParts = [data.descricao_tipo_de_logradouro, data.logradouro]
      .filter(Boolean)
      .join(' ')
      .trim();

    const phoneParts = [data.ddd_telefone_1, data.ddd_telefone_2].filter(Boolean);
    const phone = phoneParts.length > 0 ? phoneParts[0]!.replace(/\s+/g, '') : null;

    const secondaryActivities = (data.cnaes_secundarios || []).map((sec) => ({
      code: String(sec.codigo || '').padStart(7, '0'),
      description: String(sec.descricao || '').trim(),
    }));

    return {
      cnpj: cleanCnpj,
      legalName: data.razao_social ? data.razao_social.trim() : null,
      tradeName: data.nome_fantasia ? data.nome_fantasia.trim() : null,
      registrationStatus: data.descricao_situacao_cadastral
        ? data.descricao_situacao_cadastral.toUpperCase().trim()
        : null,
      openedAt: data.data_inicio_atividade || null,
      establishmentType: data.descricao_matriz_filial
        ? data.descricao_matriz_filial.toUpperCase().trim()
        : null,
      legalNature: data.natureza_juridica ? data.natureza_juridica.trim() : null,
      companySize: data.descricao_porte ? data.descricao_porte.toUpperCase().trim() : null,
      shareCapital: data.capital_social != null ? String(data.capital_social) : null,
      primaryActivity: data.cnae_fiscal
        ? {
            code: String(data.cnae_fiscal).padStart(7, '0'),
            description: data.cnae_fiscal_descricao ? data.cnae_fiscal_descricao.trim() : '',
          }
        : null,
      secondaryActivities,
      address: {
        postalCode: data.cep != null ? String(data.cep).padStart(8, '0') : null,
        street: streetParts || null,
        number: data.numero ? data.numero.trim() : null,
        complement: data.complemento ? data.complemento.trim() : null,
        neighborhood: data.bairro ? data.bairro.trim() : null,
        city: data.municipio ? data.municipio.trim() : null,
        state: data.uf ? data.uf.toUpperCase().trim() : null,
        country: 'Brasil',
      },
      email: data.email ? data.email.toLowerCase().trim() : null,
      phone: phone || null,
      simpleTaxRegime: typeof data.opcao_pelo_simples === 'boolean' ? data.opcao_pelo_simples : null,
      mei: typeof data.opcao_pelo_mei === 'boolean' ? data.opcao_pelo_mei : null,
      source: 'brasilapi',
      fetchedAt: new Date().toISOString(),
      sourceUpdatedAt: data.data_situacao_cadastral || null,
    };
  }
}
