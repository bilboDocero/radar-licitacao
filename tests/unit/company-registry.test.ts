import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrasilApiAdapter } from '../../apps/api/src/modules/organizations/company-registry/brasilapi.adapter.js';
import { CnpjWsAdapter } from '../../apps/api/src/modules/organizations/company-registry/cnpjws.adapter.js';
import { CompanyRegistryService } from '../../apps/api/src/modules/organizations/company-registry/company-registry.service.js';
import {
  RegistryNotFoundError,
  RegistryRateLimitError,
  RegistryTransientError,
} from '../../apps/api/src/modules/organizations/company-registry/company-registry.interface.js';
import { organizationRegistryViewSchema } from '../../packages/contracts/src/index.js';

describe('Enriquecimento Cadastral — Adapters de Consulta de CNPJ', () => {
  describe('BrasilApiAdapter', () => {
    const adapter = new BrasilApiAdapter();

    it('normaliza payload completo da BrasilAPI para OrganizationRegistryView', () => {
      const mockRaw = {
        cnpj: '61435388000148',
        razao_social: 'BANCO BRADESCO S.A.',
        nome_fantasia: 'BRADESCO',
        situacao_cadastral: 2,
        descricao_situacao_cadastral: 'ATIVA',
        data_situacao_cadastral: '2005-11-03',
        data_inicio_atividade: '1943-03-10',
        descricao_matriz_filial: 'MATRIZ',
        natureza_juridica: 'Sociedade Anônima Aberta',
        descricao_porte: 'DEMAIS',
        capital_social: 106000000000,
        cnae_fiscal: 6422100,
        cnae_fiscal_descricao: 'Bancos múltiplos, com carteira comercial',
        cnaes_secundarios: [
          { codigo: 6424701, descricao: 'Bancos de investimento' },
          { codigo: 6431000, descricao: 'Bancos de desenvolvimento' },
        ],
        descricao_tipo_de_logradouro: 'NUCLEO',
        logradouro: 'CIDADE DE DEUS',
        numero: 'S/N',
        complemento: 'PREDIO NOVO ANDAR 4',
        bairro: 'VILA YARA',
        cep: 6029900,
        uf: 'SP',
        municipio: 'OSASCO',
        email: 'INVESTIDORES@BRADESCO.COM.BR',
        ddd_telefone_1: '11 36849441',
        opcao_pelo_simples: false,
        opcao_pelo_mei: false,
      };

      const result = adapter.mapToNormalized('61435388000148', mockRaw);

      // Validação estrita do schema Zod
      expect(() => organizationRegistryViewSchema.parse(result)).not.toThrow();

      expect(result.cnpj).toBe('61435388000148');
      expect(result.legalName).toBe('BANCO BRADESCO S.A.');
      expect(result.tradeName).toBe('BRADESCO');
      expect(result.registrationStatus).toBe('ATIVA');
      expect(result.openedAt).toBe('1943-03-10');
      expect(result.establishmentType).toBe('MATRIZ');
      expect(result.legalNature).toBe('Sociedade Anônima Aberta');
      expect(result.companySize).toBe('DEMAIS');
      expect(result.shareCapital).toBe('106000000000');
      expect(result.primaryActivity?.code).toBe('6422100');
      expect(result.primaryActivity?.description).toContain('Bancos múltiplos');
      expect(result.secondaryActivities.length).toBe(2);
      expect(result.secondaryActivities[0]?.code).toBe('6424701');
      expect(result.address.street).toBe('NUCLEO CIDADE DE DEUS');
      expect(result.address.postalCode).toBe('06029900');
      expect(result.address.city).toBe('OSASCO');
      expect(result.address.state).toBe('SP');
      expect(result.address.country).toBe('Brasil');
      expect(result.email).toBe('investidores@bradesco.com.br');
      expect(result.phone).toBe('1136849441');
      expect(result.simpleTaxRegime).toBe(false);
      expect(result.mei).toBe(false);
      expect(result.source).toBe('brasilapi');
    });

    it('preserva campos nulos quando a fonte não dispõe dos dados', () => {
      const mockEmpty = {
        cnpj: '11222333000144',
        razao_social: 'EMPRESA INDIVIDUAL',
      };

      const result = adapter.mapToNormalized('11222333000144', mockEmpty);
      expect(() => organizationRegistryViewSchema.parse(result)).not.toThrow();

      expect(result.tradeName).toBeNull();
      expect(result.registrationStatus).toBeNull();
      expect(result.shareCapital).toBeNull();
      expect(result.primaryActivity).toBeNull();
      expect(result.secondaryActivities).toEqual([]);
      expect(result.address.street).toBeNull();
      expect(result.email).toBeNull();
      expect(result.phone).toBeNull();
      expect(result.simpleTaxRegime).toBeNull();
      expect(result.mei).toBeNull();
    });

    it('trata erros HTTP da BrasilAPI adequadamente', async () => {
      const originalFetch = globalThis.fetch;

      // 404 Not Found
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }) as any;
      await expect(adapter.fetchRegistry('00000000000000')).rejects.toThrow(RegistryNotFoundError);

      // 429 Rate Limit
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      }) as any;
      await expect(adapter.fetchRegistry('61435388000148')).rejects.toThrow(RegistryRateLimitError);

      // 500 Server Error
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      }) as any;
      await expect(adapter.fetchRegistry('61435388000148')).rejects.toThrow(RegistryTransientError);

      globalThis.fetch = originalFetch;
    });
  });

  describe('CnpjWsAdapter', () => {
    it('normaliza payload do CNPJ.ws e respeita limite de taxa (3 req/min)', async () => {
      const mockRedis = {
        checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 2 }),
      } as any;

      const adapter = new CnpjWsAdapter(mockRedis);

      const mockCnpjWsRaw = {
        razao_social: 'EMPRESA TECNOLOGIA LTDA',
        capital_social: '50000.00',
        atualizado_no: '2024-01-15T10:00:00Z',
        porte: { descricao: 'Microempresa' },
        natureza_juridica: { descricao: 'Sociedade Empresária Limitada' },
        simples: { optante: 'Sim', optante_mei: 'Não' },
        estabelecimento: {
          cnpj: '12345678000199',
          tipo: 'Matriz',
          nome_fantasia: 'TECH BRASIL',
          situacao_cadastral: 'Ativa',
          data_inicio_atividade: '2020-05-10',
          logradouro: 'AVENIDA PAULISTA',
          numero: '1000',
          complemento: 'SALA 10',
          bairro: 'BELA VISTA',
          cep: '01310-100',
          ddd1: '11',
          telefone1: '987654321',
          email: 'contato@techbrasil.com.br',
          atividade_principal: {
            id: 6201501,
            descricao: 'Desenvolvimento de programas de computador sob encomenda',
          },
          atividades_secundarias: [
            { id: 6202300, descricao: 'Desenvolvimento e licenciamento de programas' },
          ],
          cidade: { nome: 'São Paulo' },
          estado: { sigla: 'SP' },
        },
      };

      const result = adapter.mapToNormalized('12345678000199', mockCnpjWsRaw);
      expect(() => organizationRegistryViewSchema.parse(result)).not.toThrow();

      expect(result.legalName).toBe('EMPRESA TECNOLOGIA LTDA');
      expect(result.tradeName).toBe('TECH BRASIL');
      expect(result.registrationStatus).toBe('ATIVA');
      expect(result.companySize).toBe('MICROEMPRESA');
      expect(result.primaryActivity?.code).toBe('6201501');
      expect(result.secondaryActivities.length).toBe(1);
      expect(result.simpleTaxRegime).toBe(true);
      expect(result.mei).toBe(false);
      expect(result.source).toBe('cnpjws');
      expect(result.address.postalCode).toBe('01310100');
    });

    it('bloqueia chamadas ao CNPJ.ws quando a cota de 3 req/min for atingida', async () => {
      const mockRedisBlocked = {
        checkRateLimit: vi.fn().mockResolvedValue({ allowed: false, remaining: 0 }),
      } as any;

      const adapter = new CnpjWsAdapter(mockRedisBlocked);

      await expect(adapter.fetchRegistry('12345678000199')).rejects.toThrow(RegistryRateLimitError);
    });
  });

  describe('CompanyRegistryService (Fallback, Cache de 7 dias e Cooldown)', () => {
    let mockRedisStore: Map<string, string>;
    let mockRedis: any;

    beforeEach(() => {
      mockRedisStore = new Map();
      mockRedis = {
        get: vi.fn(async (key) => mockRedisStore.get(key) || null),
        set: vi.fn(async (key, val) => {
          mockRedisStore.set(key, val);
        }),
        checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 2 }),
      };
    });

    it('retorna do cache Redis (isCached: true) quando disponível', async () => {
      const service = new CompanyRegistryService(mockRedis);
      const cachedView = {
        cnpj: '61435388000148',
        legalName: 'BANCO BRADESCO S.A.',
        tradeName: 'BRADESCO',
        registrationStatus: 'ATIVA',
        openedAt: '1943-03-10',
        establishmentType: 'MATRIZ',
        legalNature: 'Sociedade Anônima Aberta',
        companySize: 'DEMAIS',
        shareCapital: '106000000000',
        primaryActivity: { code: '6422100', description: 'Bancos múltiplos' },
        secondaryActivities: [],
        address: { postalCode: null, street: null, number: null, complement: null, neighborhood: null, city: null, state: null, country: 'Brasil' },
        email: null,
        phone: null,
        simpleTaxRegime: false,
        mei: false,
        source: 'brasilapi',
        fetchedAt: '2026-10-12T00:00:00Z',
        sourceUpdatedAt: null,
      };

      mockRedisStore.set('company_registry:61435388000148', JSON.stringify(cachedView));

      const result = await service.getRegistryByCnpj('61435388000148');
      expect(result.isCached).toBe(true);
      expect(result.legalName).toBe('BANCO BRADESCO S.A.');
    });

    it('executa fallback controlado para CNPJ.ws quando a BrasilAPI sofre timeout ou erro 500', async () => {
      const service = new CompanyRegistryService(mockRedis);

      // Simula falha na BrasilAPI
      vi.spyOn(service.brasilApi, 'fetchRegistry').mockRejectedValue(
        new RegistryTransientError('Timeout 6000ms', 'brasilapi'),
      );

      // Simula sucesso no CNPJ.ws
      vi.spyOn(service.cnpjWs, 'fetchRegistry').mockResolvedValue({
        cnpj: '61435388000148',
        legalName: 'BANCO BRADESCO S.A.',
        tradeName: 'BRADESCO',
        registrationStatus: 'ATIVA',
        openedAt: '1943-03-10',
        establishmentType: 'MATRIZ',
        legalNature: 'S.A.',
        companySize: 'DEMAIS',
        shareCapital: '106000000000',
        primaryActivity: null,
        secondaryActivities: [],
        address: { postalCode: null, street: null, number: null, complement: null, neighborhood: null, city: null, state: null, country: 'Brasil' },
        email: null,
        phone: null,
        simpleTaxRegime: null,
        mei: null,
        source: 'cnpjws',
        fetchedAt: new Date().toISOString(),
        sourceUpdatedAt: null,
      });

      const result = await service.getRegistryByCnpj('61435388000148');
      expect(result.source).toBe('cnpjws');
      expect(result.legalName).toBe('BANCO BRADESCO S.A.');
      // Gravou no cache Redis por 7 dias
      expect(mockRedisStore.has('company_registry:61435388000148')).toBe(true);
    });

    it('NUNCA aciona fallback no CNPJ.ws quando a BrasilAPI retorna 404 (Not Found)', async () => {
      const service = new CompanyRegistryService(mockRedis);

      vi.spyOn(service.brasilApi, 'fetchRegistry').mockRejectedValue(
        new RegistryNotFoundError('00000000000000'),
      );
      const cnpjWsSpy = vi.spyOn(service.cnpjWs, 'fetchRegistry');

      await expect(service.getRegistryByCnpj('00000000000000')).rejects.toThrow(/não encontrado/);
      expect(cnpjWsSpy).not.toHaveBeenCalled();
    });

    it('aplica cooldown de 60 segundos em atualizações forçadas repetidas', async () => {
      const service = new CompanyRegistryService(mockRedis);
      mockRedisStore.set('cooldown:org_refresh:org-123', '1');

      await expect(
        service.getRegistryByCnpj('61435388000148', {
          forceRefresh: true,
          organizationId: 'org-123',
        }),
      ).rejects.toThrow(/Aguarde 60 segundos/);
    });
  });
});
