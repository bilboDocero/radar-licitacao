import { createHash } from 'node:crypto';
import net from 'node:net';
import dns from 'node:dns/promises';

export interface CollectionContext {
  since: Date;
  until: Date;
  signal?: AbortSignal;
}

export interface RawSourceRecord {
  externalId: string;
  payload: unknown;
  collectedAt: Date;
}

export interface SourceConnector {
  sourceId: string;
  collect(context: CollectionContext): AsyncIterable<RawSourceRecord>;
}

export function stableHash(value: unknown): string {
  const canonical = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(canonical)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.entries(v)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, item]) => [k, canonical(item)]),
          )
        : v;
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex');
}

/**
 * Verifica se um endereço IP é privado, loopback, link-local (cloud metadata) ou reservado.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4) return true;
    const b0 = parts[0]!;
    const b1 = parts[1]!;
    const b2 = parts[2]!;
    const b3 = parts[3]!;
    if (
      [b0, b1, b2, b3].some((p) => isNaN(p) || p < 0 || p > 255)
    ) {
      return true;
    }
    // 0.0.0.0/8 (rede local)
    if (b0 === 0) return true;
    // 127.0.0.0/8 (loopback)
    if (b0 === 127) return true;
    // 10.0.0.0/8 (RFC 1918 privada)
    if (b0 === 10) return true;
    // 172.16.0.0/12 (RFC 1918 privada)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
    // 192.168.0.0/16 (RFC 1918 privada)
    if (b0 === 192 && b1 === 168) return true;
    // 169.254.0.0/16 (link-local e AWS/GCP/Azure metadata 169.254.169.254)
    if (b0 === 169 && b1 === 254) return true;
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
    // 192.0.0.0/24 e 192.0.2.0/24 (TEST-NET-1)
    if (b0 === 192 && b1 === 0 && (b2 === 0 || b2 === 2)) return true;
    // 198.51.100.0/24 e 203.0.113.0/24 (TEST-NET-2/3)
    if (b0 === 198 && b1 === 51 && b2 === 100) return true;
    if (b0 === 203 && b1 === 0 && b2 === 113) return true;
    // 224.0.0.0/4 (multicast) e 240.0.0.0/4 (reservado)
    if (b0 >= 224) return true;
    return false;
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    // ::1 loopback
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
    // :: não especificado
    if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;
    // IPv4-mapped IPv6 (::ffff:127.0.0.1 etc.)
    if (normalized.startsWith('::ffff:')) {
      const ipv4Part = normalized.slice(7);
      if (net.isIPv4(ipv4Part)) return isPrivateOrReservedIp(ipv4Part);
    }
    // fe80::/10 link-local
    if (
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    ) {
      return true;
    }
    // fc00::/7 unique local (ULA privada)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return true;
    }
    return false;
  }

  return true; // Formato desconhecido tratado como inseguro
}

export interface ApprovedUrlOptions {
  allowedOrigins?: string[];
  allowedHostSuffixes?: string[];
  allowHttp?: boolean;
  dnsResolver?: (
    hostname: string,
    options?: { all?: boolean },
  ) => Promise<Array<{ address: string; family: number }>>;
}

export const APPROVED_GOV_ORIGINS = [
  'https://pncp.gov.br',
  'https://api.pncp.gov.br',
  'https://comprasnet.gov.br',
  'https://compras.gov.br',
];

/**
 * Validação segura de URL contra ataques de SSRF, credenciais embutidas e origens não homologadas.
 */
export function assertApprovedUrl(
  input: string,
  expectedOriginOrOptions?: string | ApprovedUrlOptions,
): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error(`URL malformada ou inválida: ${input}`);
  }

  const opts: ApprovedUrlOptions =
    typeof expectedOriginOrOptions === 'string'
      ? { allowedOrigins: [expectedOriginOrOptions] }
      : expectedOriginOrOptions || {
          allowedOrigins: APPROVED_GOV_ORIGINS,
          allowedHostSuffixes: ['.gov.br', '.jus.br', '.leg.br', '.mp.br'],
        };

  // 1. Validação de protocolo
  if (url.protocol !== 'https:' && !(opts.allowHttp && url.protocol === 'http:')) {
    throw new Error(`Protocolo proibido (${url.protocol}). Somente HTTPS é permitido.`);
  }

  // 2. Proibição estrita de credenciais embutidas e portas anômalas
  if (url.username || url.password) {
    throw new Error('Acesso negado: Credenciais embutidas na URL não são permitidas.');
  }

  // 3. Proibição de portas não convencionais
  if (url.port && url.port !== '443' && url.port !== '80') {
    throw new Error(`Porta não padrão proibida: ${url.port}`);
  }

  // 4. Verificação se o hostname é um IP literal
  if (net.isIP(url.hostname)) {
    if (isPrivateOrReservedIp(url.hostname)) {
      throw new Error(`Acesso negado: IP literal privado ou reservado (${url.hostname})`);
    }
  }

  // 5. Bloqueio de localhost
  if (url.hostname.toLowerCase() === 'localhost' || url.hostname.endsWith('.localhost')) {
    throw new Error('Acesso negado: Destino localhost proibido.');
  }

  // 6. Verificação de origens homologadas
  const allowedOrigins = opts.allowedOrigins || APPROVED_GOV_ORIGINS;
  const isExactOrigin = allowedOrigins.some((orig) => {
    try {
      const app = new URL(orig);
      return url.origin === app.origin;
    } catch {
      return false;
    }
  });

  const hostSuffixes = opts.allowedHostSuffixes || ['.gov.br', '.jus.br', '.leg.br', '.mp.br'];
  const hasAllowedSuffix = hostSuffixes.some((sfx) =>
    url.hostname.toLowerCase().endsWith(sfx.toLowerCase()),
  );

  if (!isExactOrigin && !hasAllowedSuffix) {
    throw new Error(`Origem não homologada: ${url.origin}`);
  }

  return url;
}

/**
 * Validação de resolução de DNS para prevenir DNS Rebinding e resolução de domínios públicos para IPs internos.
 */
export async function assertSafeDestinationDns(
  hostname: string,
  resolver?: (
    hostname: string,
    options?: { all?: boolean },
  ) => Promise<Array<{ address: string; family: number }>>,
): Promise<string[]> {
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new Error(`Acesso negado: IP de destino privado ou reservado (${hostname})`);
    }
    return [hostname];
  }

  const lookupFn = resolver || (dns.lookup as any);
  let addresses: Array<{ address: string; family: number }> = [];

  try {
    const res = await lookupFn(hostname, { all: true });
    addresses = Array.isArray(res) ? res : [res];
  } catch (err) {
    throw new Error(
      `Falha na resolução DNS para ${hostname}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!addresses || addresses.length === 0) {
    throw new Error(`Nenhum endereço retornado pelo DNS para ${hostname}`);
  }

  for (const entry of addresses) {
    if (isPrivateOrReservedIp(entry.address)) {
      throw new Error(
        `Acesso negado: DNS de ${hostname} resolveu para endereço privado/restrito (${entry.address})`,
      );
    }
  }

  return addresses.map((a) => a.address);
}

export interface SafeDownloadOptions extends ApprovedUrlOptions {
  maxBytes?: number; // default: 20 MB (20 * 1024 * 1024)
  timeoutMs?: number; // default: 25000 ms
  maxRedirects?: number; // default: 3
  allowedMimeTypes?: string[];
}

export interface SafeDownloadResult {
  buffer: Buffer;
  contentType: string;
  bytesCount: number;
  finalUrl: string;
  sha256: string;
}

/**
 * Cliente HTTP seguro com prevenção completa de SSRF, validação de DNS a cada salto,
 * bloqueio de redirects não homologados, controle estrito de timeout e limite de tamanho.
 */
export async function safeDownloadFile(
  targetUrl: string,
  options: SafeDownloadOptions = {},
): Promise<SafeDownloadResult> {
  const maxBytes = options.maxBytes ?? 20 * 1024 * 1024; // 20 MB
  const timeoutMs = options.timeoutMs ?? 25000;
  const maxRedirects = options.maxRedirects ?? 3;

  let currentUrl = targetUrl;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    // 1. Valida URL e origem
    const validatedUrl = assertApprovedUrl(currentUrl, options);

    // 2. Valida resolução DNS antes do salto
    await assertSafeDestinationDns(validatedUrl.hostname, options.dnsResolver);

    // 3. Executa requisição com redirect manual e timeout estendido até o fim do download
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    let buffer: Buffer;
    let contentType = 'application/octet-stream';

    try {
      response = await fetch(validatedUrl.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'RadarDeLicitacoes-Bot/1.0 (+https://radar.gov)',
          Accept: 'application/pdf, text/plain, text/html, application/json, */*',
        },
        redirect: 'manual',
        signal: controller.signal,
      });

      // 4. Tratamento de redirecionamentos seguros
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        clearTimeout(timeoutId);
        redirectsCount++;
        if (redirectsCount > maxRedirects) {
          throw new Error(`Número máximo de redirecionamentos (${maxRedirects}) excedido.`);
        }

        const locationHeader = response.headers.get('location');
        if (!locationHeader) {
          throw new Error(`Redirecionamento HTTP ${response.status} sem cabeçalho Location.`);
        }

        const nextUrl = new URL(locationHeader, validatedUrl).toString();
        currentUrl = nextUrl;
        continue;
      }

      if (!response.ok) {
        clearTimeout(timeoutId);
        throw new Error(`Download falhou com status HTTP ${response.status} (${response.statusText})`);
      }

      // 5. Validação de Content-Length prévio se informado
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > maxBytes) {
        clearTimeout(timeoutId);
        throw new Error(
          `Arquivo excede o limite máximo permitido de ${maxBytes} bytes (recebido: ${contentLength} bytes).`,
        );
      }

      contentType = response.headers.get('content-type') || 'application/octet-stream';

      // 6. Leitura do buffer com sinal de timeout ativo
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Timeout de download excedido (${timeoutMs}ms) para ${currentUrl}`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (buffer.length > maxBytes) {
      throw new Error(
        `Arquivo baixado excedeu o limite máximo permitido de ${maxBytes} bytes (tamanho real: ${buffer.length} bytes).`,
      );
    }

    const sha256 = createHash('sha256').update(buffer).digest('hex');

    return {
      buffer,
      contentType,
      bytesCount: buffer.length,
      finalUrl: currentUrl,
      sha256,
    };
  }

  throw new Error('Falha ao concluir download.');
}
