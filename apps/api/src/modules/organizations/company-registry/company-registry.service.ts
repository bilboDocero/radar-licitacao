import {
  Injectable,
  Inject,
  NotFoundException,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { OrganizationRegistryView } from '@radar/contracts';
import { RedisService } from '../../../common/redis.module.js';
import { BrasilApiAdapter } from './brasilapi.adapter.js';
import { CnpjWsAdapter } from './cnpjws.adapter.js';
import { MockRegistryAdapter } from './mock.adapter.js';
import {
  type CompanyRegistryAdapter,
  RegistryNotFoundError,
  RegistryRateLimitError,
  RegistryTransientError,
} from './company-registry.interface.js';
import { logger } from '@radar/config';

@Injectable()
export class CompanyRegistryService {
  readonly brasilApi: BrasilApiAdapter;
  readonly cnpjWs: CnpjWsAdapter;
  readonly mock: MockRegistryAdapter;

  private readonly inFlight = new Map<string, Promise<OrganizationRegistryView>>();
  private readonly cacheTtlSeconds = 7 * 24 * 60 * 60; // 7 dias

  constructor(@Inject(RedisService) private readonly redis: RedisService) {
    this.brasilApi = new BrasilApiAdapter();
    this.cnpjWs = new CnpjWsAdapter(this.redis);
    this.mock = new MockRegistryAdapter();
  }

  async getRegistryByCnpj(
    cnpj: string,
    options?: {
      forceRefresh?: boolean;
      organizationId?: string;
      preferredSource?: 'brasilapi' | 'cnpjws' | 'mock';
    },
  ): Promise<OrganizationRegistryView> {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      throw new NotFoundException(`CNPJ inválido (${cnpj}). O CNPJ deve conter 14 dígitos.`);
    }

    const cacheKey = `company_registry:${cleanCnpj}`;

    // 1. Verificação de Cooldown se for atualização forçada
    if (options?.forceRefresh && options.organizationId) {
      const cooldownKey = `cooldown:org_refresh:${options.organizationId}`;
      const cooldownActive = await this.redis.get(cooldownKey);
      if (cooldownActive) {
        throw new HttpException(
          'Aguarde 60 segundos antes de solicitar uma nova atualização dos dados cadastrais.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      // Marca cooldown de 60 segundos
      await this.redis.set(cooldownKey, '1', 60);
    }

    // 2. Consulta ao Cache Redis se não for atualização forçada
    if (!options?.forceRefresh) {
      const cachedRaw = await this.redis.get(cacheKey);
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw) as OrganizationRegistryView;
          return { ...cached, isCached: true };
        } catch {
          // Cache corrompido, prossegue para consulta fresca
        }
      }
    }

    // 3. Single-flight mutex para evitar consultas externas concorrentes idênticas
    const existingFlight = this.inFlight.get(cleanCnpj);
    if (existingFlight) {
      return existingFlight;
    }

    const fetchPromise = this.executeFetchWithFallback(cleanCnpj, options?.preferredSource);
    this.inFlight.set(cleanCnpj, fetchPromise);

    try {
      const result = await fetchPromise;

      // Grava no Redis por 7 dias
      await this.redis.set(cacheKey, JSON.stringify(result), this.cacheTtlSeconds);

      return { ...result, isCached: false };
    } finally {
      this.inFlight.delete(cleanCnpj);
    }
  }

  private async executeFetchWithFallback(
    cleanCnpj: string,
    preferredSource?: 'brasilapi' | 'cnpjws' | 'mock',
  ): Promise<OrganizationRegistryView> {
    if (preferredSource === 'mock') {
      return this.mock.fetchRegistry(cleanCnpj);
    }

    // Fonte Primária: BrasilAPI
    try {
      logger.info({ cnpj: cleanCnpj, source: 'brasilapi' }, 'Consultando dados cadastrais na BrasilAPI');
      return await this.brasilApi.fetchRegistry(cleanCnpj);
    } catch (primaryErr) {
      // Se for 404 Not Found, NUNCA executa fallback (CNPJ simplesmente não existe na base oficial)
      if (primaryErr instanceof RegistryNotFoundError) {
        throw new NotFoundException(primaryErr.message);
      }

      logger.warn(
        { err: primaryErr, cnpj: cleanCnpj },
        'Falha na fonte primária (BrasilAPI); avaliando fallback controlado no CNPJ.ws',
      );

      // Fallback Controlado: CNPJ.ws
      try {
        logger.info({ cnpj: cleanCnpj, source: 'cnpjws' }, 'Acionando fallback no CNPJ.ws');
        return await this.cnpjWs.fetchRegistry(cleanCnpj);
      } catch (fallbackErr) {
        if (fallbackErr instanceof RegistryNotFoundError) {
          throw new NotFoundException(fallbackErr.message);
        }

        if (fallbackErr instanceof RegistryRateLimitError) {
          logger.warn({ cnpj: cleanCnpj }, 'Limite do CNPJ.ws atingido');
        }

        logger.error({ primaryErr, fallbackErr, cnpj: cleanCnpj }, 'Ambas as fontes públicas falharam');

        // Se houver cache expirado/antigo no Redis, tenta retornar com aviso
        const staleRaw = await this.redis.get(`company_registry:${cleanCnpj}`);
        if (staleRaw) {
          try {
            const stale = JSON.parse(staleRaw) as OrganizationRegistryView;
            return { ...stale, isCached: true };
          } catch {
            // prossegue para exceção
          }
        }

        throw new ServiceUnavailableException(
          'Serviços públicos de consulta de CNPJ temporariamente indisponíveis. Tente novamente mais tarde.',
        );
      }
    }
  }
}
