import { describe, it, expect, vi } from 'vitest';
import {
  assertApprovedUrl,
  isPrivateOrReservedIp,
  assertSafeDestinationDns,
  safeDownloadFile,
} from '../../packages/source-sdk/src/index.js';

describe('Segurança Egress & Proteção SSRF', () => {
  describe('isPrivateOrReservedIp', () => {
    it('identifica corretamente IPs privados, loopback e link-local (IPv4)', () => {
      // Loopback
      expect(isPrivateOrReservedIp('127.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('127.255.255.255')).toBe(true);
      expect(isPrivateOrReservedIp('0.0.0.0')).toBe(true);

      // RFC 1918 privados
      expect(isPrivateOrReservedIp('10.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('10.255.255.255')).toBe(true);
      expect(isPrivateOrReservedIp('172.16.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('172.31.255.255')).toBe(true);
      expect(isPrivateOrReservedIp('192.168.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('192.168.1.254')).toBe(true);

      // Cloud metadata (AWS, Azure, GCP, OpenStack)
      expect(isPrivateOrReservedIp('169.254.169.254')).toBe(true);
      expect(isPrivateOrReservedIp('169.254.1.1')).toBe(true);

      // CGNAT e redes de teste
      expect(isPrivateOrReservedIp('100.64.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('192.0.2.1')).toBe(true);

      // Multicast e broadcast
      expect(isPrivateOrReservedIp('224.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('255.255.255.255')).toBe(true);

      // IPs públicos legítimos
      expect(isPrivateOrReservedIp('8.8.8.8')).toBe(false);
      expect(isPrivateOrReservedIp('1.1.1.1')).toBe(false);
      expect(isPrivateOrReservedIp('200.147.67.142')).toBe(false);
    });

    it('identifica corretamente endereços IPv6 privados e loopback', () => {
      expect(isPrivateOrReservedIp('::1')).toBe(true);
      expect(isPrivateOrReservedIp('0:0:0:0:0:0:0:1')).toBe(true);
      expect(isPrivateOrReservedIp('::')).toBe(true);
      // Link-local IPv6
      expect(isPrivateOrReservedIp('fe80::1')).toBe(true);
      // Unique Local IPv6 (fc00::/7)
      expect(isPrivateOrReservedIp('fc00::1')).toBe(true);
      expect(isPrivateOrReservedIp('fd12:3456:789a::1')).toBe(true);
      // IPv4-mapped IPv6 de IP privado
      expect(isPrivateOrReservedIp('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('::ffff:192.168.1.1')).toBe(true);

      // IPv6 público legítimo
      expect(isPrivateOrReservedIp('2001:4860:4860::8888')).toBe(false);
    });
  });

  describe('assertApprovedUrl', () => {
    it('permite URLs HTTPS de origens públicas homologadas do governo', () => {
      expect(() => assertApprovedUrl('https://pncp.gov.br/app/editais/123')).not.toThrow();
      expect(() => assertApprovedUrl('https://api.pncp.gov.br/v1/contratacoes')).not.toThrow();
      expect(() => assertApprovedUrl('https://comprasnet.gov.br/seguro/index.html')).not.toThrow();
      expect(() => assertApprovedUrl('https://tre-sp.jus.br/licitacoes/edital.pdf')).not.toThrow();
    });

    it('rejeita protocolos inseguros e não-HTTP(S)', () => {
      expect(() => assertApprovedUrl('http://pncp.gov.br/teste')).toThrow(/Protocolo proibido/);
      expect(() => assertApprovedUrl('ftp://pncp.gov.br/edital.pdf')).toThrow(/Protocolo proibido/);
      expect(() => assertApprovedUrl('file:///etc/passwd')).toThrow(/Protocolo proibido/);
      expect(() => assertApprovedUrl('gopher://pncp.gov.br')).toThrow(/Protocolo proibido/);
    });

    it('bloqueia estritamente credenciais embutidas na URL', () => {
      expect(() => assertApprovedUrl('https://admin:senha@pncp.gov.br/edital')).toThrow(
        /Credenciais embutidas/,
      );
      expect(() => assertApprovedUrl('https://user@pncp.gov.br/edital')).toThrow(
        /Credenciais embutidas/,
      );
    });

    it('bloqueia portas não padrão', () => {
      expect(() => assertApprovedUrl('https://pncp.gov.br:8443/edital')).toThrow(
        /Porta não padrão proibida/,
      );
      expect(() => assertApprovedUrl('https://pncp.gov.br:22/edital')).toThrow(
        /Porta não padrão proibida/,
      );
    });

    it('bloqueia localhost e subdomínios de localhost', () => {
      expect(() => assertApprovedUrl('https://localhost/edital')).toThrow(/Destino localhost/);
      expect(() => assertApprovedUrl('https://app.localhost/edital')).toThrow(/Destino localhost/);
    });

    it('bloqueia IPs literais privados e link-local', () => {
      expect(() => assertApprovedUrl('https://127.0.0.1/edital')).toThrow(/IP literal privado/);
      expect(() => assertApprovedUrl('https://10.0.0.1/edital')).toThrow(/IP literal privado/);
      expect(() => assertApprovedUrl('https://192.168.1.1/edital')).toThrow(/IP literal privado/);
      expect(() => assertApprovedUrl('https://169.254.169.254/latest/meta-data')).toThrow(
        /IP literal privado/,
      );
    });

    it('rejeita domínios arbitrários fora da lista homologada', () => {
      expect(() => assertApprovedUrl('https://google.com')).toThrow(/Origem não homologada/);
      expect(() => assertApprovedUrl('https://servidor-interno-malicioso.com')).toThrow(
        /Origem não homologada/,
      );
    });
  });

  describe('assertSafeDestinationDns (Prevenção de DNS Rebinding)', () => {
    it('bloqueia domínios cujo DNS resolve para endereço IP privado', async () => {
      const mockResolver = vi.fn().mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);

      await expect(
        assertSafeDestinationDns('dominio-rebinding.gov.br', mockResolver as any),
      ).rejects.toThrow(/DNS .* resolveu para endereço privado/);
    });

    it('bloqueia domínios cujo DNS resolve para link-local/cloud metadata', async () => {
      const mockResolver = vi
        .fn()
        .mockResolvedValue([{ address: '169.254.169.254', family: 4 }]);

      await expect(
        assertSafeDestinationDns('meta.gov.br', mockResolver as any),
      ).rejects.toThrow(/DNS .* resolveu para endereço privado/);
    });

    it('permite domínios cujo DNS resolve para endereço IP público', async () => {
      const mockResolver = vi
        .fn()
        .mockResolvedValue([{ address: '200.147.67.142', family: 4 }]);

      const ips = await assertSafeDestinationDns('portal.pncp.gov.br', mockResolver as any);
      expect(ips).toEqual(['200.147.67.142']);
    });
  });

  describe('safeDownloadFile', () => {
    it('bloqueia downloads que excedam o limite máximo configurado (maxBytes)', async () => {
      // Simula uma resposta com Content-Length maior que o permitido
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-length': '25000000', // 25 MB
          'content-type': 'application/pdf',
        }),
        arrayBuffer: async () => new ArrayBuffer(100),
      }) as any;

      const mockDns = vi.fn().mockResolvedValue([{ address: '200.147.67.142', family: 4 }]);

      try {
        await expect(
          safeDownloadFile('https://pncp.gov.br/arquivo-grande.pdf', {
            maxBytes: 10 * 1024 * 1024, // 10 MB
            dnsResolver: mockDns as any,
          }),
        ).rejects.toThrow(/excede o limite máximo permitido/);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
