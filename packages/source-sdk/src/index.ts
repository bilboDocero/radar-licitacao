import { createHash } from 'node:crypto';
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
/** Only vetted, compiled-in origins may be fetched. Never follow redirects. */
export function assertApprovedUrl(input: string, origin: string) {
  const url = new URL(input);
  const approved = new URL(origin);
  if (
    url.protocol !== 'https:' ||
    url.origin !== approved.origin ||
    url.username ||
    url.password ||
    url.hash
  )
    throw new Error('URL fora da fonte homologada');
  return url;
}
