import type { OrganizationRegistryView } from '@radar/contracts';
import type { CompanyRegistryAdapter } from './company-registry.interface.js';

export class MockRegistryAdapter implements CompanyRegistryAdapter {
  readonly id = 'mock' as const;

  async fetchRegistry(cnpj: string): Promise<OrganizationRegistryView> {
    const cleanCnpj = cnpj.replace(/\D/g, '');

    return {
      cnpj: cleanCnpj,
      legalName: 'BANCO BRADESCO S.A.',
      tradeName: 'BRADESCO',
      registrationStatus: 'ATIVA',
      openedAt: '1943-03-10',
      establishmentType: 'MATRIZ',
      legalNature: 'Sociedade Anônima Aberta',
      companySize: 'DEMAIS',
      shareCapital: '106000000000',
      primaryActivity: {
        code: '6422100',
        description: 'Bancos múltiplos, com carteira comercial',
      },
      secondaryActivities: [
        { code: '6424701', description: 'Bancos de investimento' },
        { code: '6431000', description: 'Bancos de desenvolvimento' },
        { code: '6619302', description: 'Correspondentes de instituições financeiras' },
      ],
      address: {
        postalCode: '06029900',
        street: 'NUCLEO CIDADE DE DEUS',
        number: 'S/N',
        complement: 'PREDIO NOVO ANDAR 4',
        neighborhood: 'VILA YARA',
        city: 'Osasco',
        state: 'SP',
        country: 'Brasil',
      },
      email: 'investidores@bradesco.com.br',
      phone: '1136849441',
      simpleTaxRegime: false,
      mei: false,
      source: 'mock',
      fetchedAt: new Date().toISOString(),
      sourceUpdatedAt: '2024-05-18T00:00:00.000Z',
    };
  }
}
