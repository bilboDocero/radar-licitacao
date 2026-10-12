import type { OrganizationRegistryView } from '@radar/contracts';
import {
  type CompanyRegistryAdapter,
  RegistryNotFoundError,
  RegistryTransientError,
  RegistryRateLimitError,
} from './company-registry.interface.js';
import type { RedisService } from '../../../common/redis.module.js';
import { logger } from '@radar/config';

interface CnpjWsResponse {
  cnpj_raiz?: string;
  razao_social?: string | null;
  capital_social?: string | number | null;
  atualizado_no?: string | null;
  porte?: {
    id?: string;
    descricao?: string | null;
  } | null;
  natureza_juridica?: {
    id?: string;
    descricao?: string | null;
  } | null;
  simples?: {
    optante?: string | null;
    optante_mei?: string | null;
  } | null;
  estabelecimento?: {
    cnpj?: string | null;
    tipo?: string | null;
    nome_fantasia?: string | null;
    situacao_cadastral?: string | null;
    data_situacao_cadastral?: string | null;
    data_inicio_atividade?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cep?: string | null;
    ddd1?: string | null;
    telefone1?: string | null;
    email?: string | null;
    atividade_principal?: {
      id?: string | number;
      subclasse?: string;
      descricao?: string | null;
    } | null;
    atividades_secundarias?: Array<{
      id?: string | number;
      subclasse?: string;
      descricao?: string | null;
    }> | null;
    estado?: {
      sigla?: string | null;
      nome?: string | null;
    } | null;
    cidade?: {
      nome?: string | null;
    } | null;
    pais?: {
      nome?: string | null;
    } | null;
  } | null;
}

export class CnpjWsAdapter implements CompanyRegistryAdapter {
  readonly id = 'cnpjws' as const;

  constructor(
    private readonly redis: RedisService,
    private readonly baseUrl = 'https://publica.cnpj.ws/cnpj',
    private readonly timeoutMs = 6000,
  ) {}

  async fetchRegistry(cnpj: string): Promise<OrganizationRegistryView> {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      throw new Error(`CNPJ inválido para consulta: ${cnpj}`);
    }

    // Controle estrito de taxa compartilhado no Redis: máximo 3 requisições por minuto por IP/instância
    const rateCheck = await this.redis.checkRateLimit('ratelimit:cnpjws:public', 60, 3);
    if (!rateCheck.allowed) {
      throw new RegistryRateLimitError(
        this.id,
        'Limite de 3 requisições por minuto da API pública CNPJ.ws atingido. Consulta cancelada para evitar bloqueio.',
      );
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
          `Timeout de consulta (${this.timeoutMs}ms) no CNPJ.ws`,
          this.id,
          err,
        );
      }
      throw new RegistryTransientError(
        `Falha de rede ao consultar CNPJ.ws: ${err instanceof Error ? err.message : String(err)}`,
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
      throw new RegistryRateLimitError(this.id, 'Limite de consultas excedido no CNPJ.ws (HTTP 429).');
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new RegistryTransientError(
        `CNPJ.ws retornou HTTP ${response.status}: ${errText.slice(0, 200)}`,
        this.id,
      );
    }

    let payload: CnpjWsResponse;
    try {
      payload = (await response.json()) as CnpjWsResponse;
    } catch (err) {
      throw new RegistryTransientError('CNPJ.ws retornou JSON inválido', this.id, err);
    }

    return this.mapToNormalized(cleanCnpj, payload);
  }

  mapToNormalized(cleanCnpj: string, data: CnpjWsResponse): OrganizationRegistryView {
    const est = data.estabelecimento || {};

    const phone =
      est.ddd1 && est.telefone1 ? `${est.ddd1}${est.telefone1}`.replace(/\s+/g, '') : null;

    const primaryCode = est.atividade_principal
      ? String(est.atividade_principal.subclasse || est.atividade_principal.id || '')
          .replace(/\D/g, '')
          .padStart(7, '0')
      : null;

    const secondaryActivities = (est.atividades_secundarias || []).map((sec) => ({
      code: String(sec.subclasse || sec.id || '')
        .replace(/\D/g, '')
        .padStart(7, '0'),
      description: String(sec.descricao || '').trim(),
    }));

    return {
      cnpj: cleanCnpj,
      legalName: data.razao_social ? data.razao_social.trim() : null,
      tradeName: est.nome_fantasia ? est.nome_fantasia.trim() : null,
      registrationStatus: est.situacao_cadastral ? est.situacao_cadastral.toUpperCase().trim() : null,
      openedAt: est.data_inicio_atividade || null,
      establishmentType: est.tipo ? est.tipo.toUpperCase().trim() : null,
      legalNature: data.natureza_juridica?.descricao ? data.natureza_juridica.descricao.trim() : null,
      companySize: data.porte?.descricao ? data.porte.descricao.toUpperCase().trim() : null,
      shareCapital: data.capital_social != null ? String(data.capital_social) : null,
      primaryActivity: primaryCode
        ? {
            code: primaryCode,
            description: est.atividade_principal?.descricao
              ? est.atividade_principal.descricao.trim()
              : '',
          }
        : null,
      secondaryActivities,
      address: {
        postalCode: est.cep ? String(est.cep).replace(/\D/g, '').padStart(8, '0') : null,
        street: est.logradouro ? est.logradouro.trim() : null,
        number: est.numero ? est.numero.trim() : null,
        complement: est.complemento ? est.complemento.trim() : null,
        neighborhood: est.bairro ? est.bairro.trim() : null,
        city: est.cidade?.nome ? est.cidade.nome.trim() : null,
        state: est.estado?.sigla ? est.estado.sigla.toUpperCase().trim() : null,
        country: est.pais?.nome || 'Brasil',
      },
      email: est.email ? est.email.toLowerCase().trim() : null,
      phone,
      simpleTaxRegime:
        data.simples?.optante === 'Sim' ? true : data.simples?.optante === 'Não' ? false : null,
      mei:
        data.simples?.optante_mei === 'Sim'
          ? true
          : data.simples?.optante_mei === 'Não'
            ? false
            : null,
      source: 'cnpjws',
      fetchedAt: new Date().toISOString(),
      sourceUpdatedAt: data.atualizado_no || est.data_situacao_cadastral || null,
    };
  }
}
