import type { OrganizationRegistryView } from '@radar/contracts';

export class RegistryNotFoundError extends Error {
  constructor(public readonly cnpj: string) {
    super(`CNPJ ${cnpj} não encontrado na base da Receita Federal.`);
    this.name = 'RegistryNotFoundError';
  }
}

export class RegistryTransientError extends Error {
  constructor(message: string, public readonly source: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'RegistryTransientError';
  }
}

export class RegistryRateLimitError extends Error {
  constructor(public readonly source: string, message = 'Limite de consultas excedido na fonte.') {
    super(message);
    this.name = 'RegistryRateLimitError';
  }
}

export interface CompanyRegistryAdapter {
  readonly id: 'brasilapi' | 'cnpjws' | 'mock';
  fetchRegistry(cnpj: string): Promise<OrganizationRegistryView>;
}
