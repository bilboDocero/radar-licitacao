import { describe, it, expect } from 'vitest';
import { organizationInput } from '../../packages/contracts/src/index.js';
import { maskCnpjInput, formatCnpj } from '../../apps/web/app/composables/useRadar.js';

describe('Contratos e Máscara de CNPJ', () => {
  it('aceita CNPJ formatado e armazena apenas números', () => {
    const parsed = organizationInput.parse({
      name: 'Empresa Teste S/A',
      cnpj: '61.435.388/0001-48',
    });

    expect(parsed.name).toBe('Empresa Teste S/A');
    expect(parsed.cnpj).toBe('61435388000148');
    expect(parsed.cnpj).toMatch(/^\d{14}$/);
  });

  it('aceita CNPJ somente números e preserva os 14 dígitos', () => {
    const parsed = organizationInput.parse({
      name: 'Empresa Teste S/A',
      cnpj: '61435388000148',
    });

    expect(parsed.cnpj).toBe('61435388000148');
  });

  it('trata espaços extras e pontuação no CNPJ', () => {
    const parsed = organizationInput.parse({
      name: 'Empresa Teste S/A',
      cnpj: '  61.435.388/0001-48  ',
    });

    expect(parsed.cnpj).toBe('61435388000148');
  });

  it('converte CNPJ vazio ou apenas espaços para undefined', () => {
    const parsedEmpty = organizationInput.parse({
      name: 'Empresa Teste S/A',
      cnpj: '',
    });
    expect(parsedEmpty.cnpj).toBeUndefined();

    const parsedSpaces = organizationInput.parse({
      name: 'Empresa Teste S/A',
      cnpj: '   ',
    });
    expect(parsedSpaces.cnpj).toBeUndefined();
  });

  it('rejeita CNPJ com quantidade de dígitos diferente de 14', () => {
    expect(() =>
      organizationInput.parse({
        name: 'Empresa Teste',
        cnpj: '123456789',
      }),
    ).toThrow(/CNPJ deve conter 14 dígitos/);

    expect(() =>
      organizationInput.parse({
        name: 'Empresa Teste',
        cnpj: '61.435.388/0001-4', // 13 dígitos
      }),
    ).toThrow(/CNPJ deve conter 14 dígitos/);

    expect(() =>
      organizationInput.parse({
        name: 'Empresa Teste',
        cnpj: '61.435.388/0001-4899', // 16 dígitos
      }),
    ).toThrow(/CNPJ deve conter 14 dígitos/);
  });

  it('aplica máscara progressiva com maskCnpjInput', () => {
    expect(maskCnpjInput('')).toBe('');
    expect(maskCnpjInput('61')).toBe('61');
    expect(maskCnpjInput('614')).toBe('61.4');
    expect(maskCnpjInput('61435')).toBe('61.435');
    expect(maskCnpjInput('61435388')).toBe('61.435.388');
    expect(maskCnpjInput('614353880001')).toBe('61.435.388/0001');
    expect(maskCnpjInput('61435388000148')).toBe('61.435.388/0001-48');
    // Aceita valor já formatado e preserva formatação de até 14 dígitos
    expect(maskCnpjInput('61.435.388/0001-48')).toBe('61.435.388/0001-48');
  });

  it('formata CNPJ para exibição com formatCnpj', () => {
    expect(formatCnpj(null)).toBe('Não informado');
    expect(formatCnpj(undefined)).toBe('Não informado');
    expect(formatCnpj('')).toBe('Não informado');
    expect(formatCnpj('61435388000148')).toBe('61.435.388/0001-48');
    expect(formatCnpj('61.435.388/0001-48')).toBe('61.435.388/0001-48');
    expect(formatCnpj('123')).toBe('123'); // fallback
  });
});
