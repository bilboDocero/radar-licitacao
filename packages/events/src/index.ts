import { z } from 'zod';
export const queues = { collection: 'radar-collection', matching: 'radar-matching' } as const;
export const eventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('procurement.changed'), procurementId: z.string().uuid() }),
  z.object({ type: z.literal('profile.changed'), organizationId: z.string().uuid() }),
]);
export type DomainEvent = z.infer<typeof eventSchema>;
