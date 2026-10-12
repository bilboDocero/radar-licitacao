import { z } from 'zod';
export const queues = {
  collection: 'radar-collection',
  matching: 'radar-matching',
  intelligence: 'radar-intelligence',
} as const;
export const eventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('procurement.changed'), procurementId: z.string().uuid() }),
  z.object({ type: z.literal('profile.changed'), organizationId: z.string().uuid() }),
  z.object({
    type: z.literal('procurement.ai.analyze'),
    procurementId: z.string().uuid(),
    version: z.number().int().optional(),
  }),
  z.object({
    type: z.literal('opportunity.brief.generate'),
    organizationId: z.string().uuid(),
    profileId: z.string().uuid(),
    procurementId: z.string().uuid(),
  }),
]);
export type DomainEvent = z.infer<typeof eventSchema>;

