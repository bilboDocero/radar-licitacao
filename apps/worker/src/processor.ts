import { and, eq, gt } from 'drizzle-orm';
import {
  commercialProfiles,
  procurements,
  opportunityMatches,
  alerts,
  alertPreferences,
  subscriptions,
  plans,
  type Database,
} from '@radar/database';
import { matchProcurement, type CanonicalProcurement } from '@radar/contracts';
import { eventSchema } from '@radar/events';
export async function processEvent(db: Database, input: unknown) {
  const event = eventSchema.parse(input);
  const profiles = await db
    .select()
    .from(commercialProfiles)
    .where(
      event.type === 'profile.changed'
        ? eq(commercialProfiles.organizationId, event.organizationId)
        : undefined,
    );
  const records = await db
    .select()
    .from(procurements)
    .where(
      event.type === 'procurement.changed'
        ? eq(procurements.id, event.procurementId)
        : and(eq(procurements.status, 'open'), gt(procurements.deadline, new Date())),
    );
  for (const profile of profiles) {
    const [plan] = await db
      .select({ subscription: subscriptions, entitlements: plans.entitlements })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(eq(subscriptions.organizationId, profile.organizationId));
    if (
      !plan ||
      !['active', 'trial'].includes(plan.subscription.status) ||
      (plan.subscription.status === 'trial' &&
        (!plan.subscription.trialEndsAt || plan.subscription.trialEndsAt <= new Date()))
    )
      continue;
    const preferences = await db.query.alertPreferences.findFirst({
      where: eq(alertPreferences.organizationId, profile.organizationId),
    });
    for (const record of records) {
      const canonical: CanonicalProcurement = {
        ...record,
        publishedAt: record.publishedAt.toISOString(),
        sourceUpdatedAt: record.sourceUpdatedAt.toISOString(),
        deadline: record.deadline?.toISOString() || null,
      };
      const result = matchProcurement(profile, canonical);
      await db.transaction(async (tx) => {
        if (!result.matches) {
          await tx
            .delete(opportunityMatches)
            .where(
              and(
                eq(opportunityMatches.profileId, profile.id),
                eq(opportunityMatches.procurementId, record.id),
              ),
            );
          return;
        }
        await tx
          .insert(opportunityMatches)
          .values({
            organizationId: profile.organizationId,
            profileId: profile.id,
            procurementId: record.id,
            score: result.score,
            reasons: result.reasons,
            geographyBasis: result.geographyBasis,
          })
          .onConflictDoUpdate({
            target: [opportunityMatches.profileId, opportunityMatches.procurementId],
            set: {
              score: result.score,
              reasons: result.reasons,
              geographyBasis: result.geographyBasis,
            },
          });
        if (preferences?.enabled && plan.entitlements['alerts.enabled'])
          await tx
            .insert(alerts)
            .values({
              organizationId: profile.organizationId,
              procurementId: record.id,
              eventKey: `${profile.organizationId}:${record.id}:${record.version}`,
              message: `${record.version > 1 ? 'Oportunidade atualizada' : 'Nova oportunidade'}: ${record.title.slice(0, 180)}`,
            })
            .onConflictDoNothing();
      });
    }
  }
}
