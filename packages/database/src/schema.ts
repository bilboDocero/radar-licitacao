import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  numeric,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import type {
  Coverage,
  CanonicalProcurement,
  Role,
  AIAnalysisStatus,
  Requirement,
  RiskItem,
  ExecutionPlace,
} from '@radar/contracts';
const id = () => uuid('id').primaryKey().defaultRandom();
const created = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
export const users = pgTable('users', {
  id: id(),
  subject: text('subject').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  createdAt: created(),
});
export const organizations = pgTable('organizations', {
  id: id(),
  name: text('name').notNull(),
  cnpj: text('cnpj').unique(),
  createdAt: created(),
});
export const organizationMembers = pgTable(
  'organization_members',
  {
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: text('role').$type<Role>().notNull(),
    createdAt: created(),
  },
  (t) => [
    primaryKey({ columns: [t.organizationId, t.userId] }),
    index('members_user_idx').on(t.userId),
  ],
);
export const partners = pgTable('partners', {
  id: id(),
  name: text('name').notNull(),
  ownerUserId: uuid('owner_user_id')
    .notNull()
    .references(() => users.id),
  brandName: text('brand_name'),
  createdAt: created(),
});
export const partnerClients = pgTable(
  'partner_clients',
  {
    partnerId: uuid('partner_id')
      .notNull()
      .references(() => partners.id),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id)
      .unique(),
    createdAt: created(),
  },
  (t) => [primaryKey({ columns: [t.partnerId, t.organizationId] })],
);
export const partnerInvitations = pgTable('partner_invitations', {
  id: id(),
  partnerId: uuid('partner_id')
    .notNull()
    .references(() => partners.id),
  email: text('email').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: created(),
});
export const commercialProfiles = pgTable(
  'commercial_profiles',
  {
    id: id(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    keywords: jsonb('keywords').$type<string[]>().notNull(),
    categories: jsonb('categories').$type<string[]>().notNull(),
    coverage: jsonb('coverage').$type<Coverage>().notNull(),
    createdAt: created(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('profile_org_idx').on(t.organizationId)],
);
export const municipalities = pgTable('municipalities', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  state: text('state').notNull(),
});
export const dataSources = pgTable('data_sources', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  baseUrl: text('base_url').notNull(),
  status: text('status').notNull().default('approved'),
  coverageNote: text('coverage_note').notNull(),
  cursor: timestamp('cursor', { withTimezone: true }),
  createdAt: created(),
});
export const sourceRequests = pgTable(
  'source_requests',
  {
    id: id(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    url: text('url').notNull(),
    reason: text('reason').notNull(),
    status: text('status').notNull().default('pending'),
    createdAt: created(),
  },
  (t) => [index('source_request_org_idx').on(t.organizationId)],
);
export const collectionRuns = pgTable('collection_runs', {
  id: id(),
  sourceId: text('source_id')
    .notNull()
    .references(() => dataSources.id),
  status: text('status').notNull(),
  records: integer('records').notNull().default(0),
  error: text('error'),
  startedAt: created(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
});
export const rawSourceRecords = pgTable(
  'raw_source_records',
  {
    id: id(),
    sourceId: text('source_id')
      .notNull()
      .references(() => dataSources.id),
    runId: uuid('run_id')
      .notNull()
      .references(() => collectionRuns.id),
    externalId: text('external_id').notNull(),
    hash: text('hash').notNull(),
    payload: jsonb('payload').notNull(),
    createdAt: created(),
  },
  (t) => [uniqueIndex('raw_record_identity').on(t.sourceId, t.externalId, t.hash)],
);
export const procurements = pgTable(
  'procurements',
  {
    id: id(),
    sourceId: text('source_id')
      .notNull()
      .references(() => dataSources.id),
    externalId: text('external_id').notNull(),
    title: text('title').notNull(),
    agency: text('agency').notNull(),
    agencyState: text('agency_state').notNull(),
    agencyMunicipality: text('agency_municipality').notNull(),
    executionState: text('execution_state'),
    executionMunicipality: text('execution_municipality'),
    category: text('category'),
    status: text('status').$type<CanonicalProcurement['status']>().notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    deadline: timestamp('deadline', { withTimezone: true }),
    estimatedValue: numeric('estimated_value', { precision: 20, scale: 2 }),
    officialUrl: text('official_url').notNull(),
    sourceUpdatedAt: timestamp('source_updated_at', { withTimezone: true }).notNull(),
    hash: text('hash').notNull(),
    version: integer('version').notNull().default(1),
    createdAt: created(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('procurement_source_identity').on(t.sourceId, t.externalId),
    index('procurement_geography_idx').on(t.agencyState, t.agencyMunicipality),
    index('procurement_deadline_idx').on(t.deadline),
    index('procurement_published_idx').on(t.publishedAt),
  ],
);
export const procurementVersions = pgTable(
  'procurement_versions',
  {
    id: id(),
    procurementId: uuid('procurement_id')
      .notNull()
      .references(() => procurements.id),
    rawRecordId: uuid('raw_record_id')
      .notNull()
      .references(() => rawSourceRecords.id),
    version: integer('version').notNull(),
    snapshot: jsonb('snapshot').$type<CanonicalProcurement>().notNull(),
    createdAt: created(),
  },
  (t) => [uniqueIndex('procurement_version_identity').on(t.procurementId, t.version)],
);
export const savedProcurements = pgTable(
  'saved_procurements',
  {
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    procurementId: uuid('procurement_id')
      .notNull()
      .references(() => procurements.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    createdAt: created(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.procurementId] })],
);
export const opportunityMatches = pgTable(
  'opportunity_matches',
  {
    id: id(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => commercialProfiles.id, { onDelete: 'cascade' }),
    procurementId: uuid('procurement_id')
      .notNull()
      .references(() => procurements.id),
    score: integer('score').notNull(),
    reasons: jsonb('reasons').$type<string[]>().notNull(),
    geographyBasis: text('geography_basis').notNull(),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex('match_profile_procurement').on(t.profileId, t.procurementId),
    index('match_org_idx').on(t.organizationId),
  ],
);
export const alertPreferences = pgTable('alert_preferences', {
  organizationId: uuid('organization_id')
    .primaryKey()
    .references(() => organizations.id),
  enabled: boolean('enabled').notNull().default(true),
  frequency: text('frequency').notNull().default('daily'),
});
export const alerts = pgTable(
  'alerts',
  {
    id: id(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    procurementId: uuid('procurement_id')
      .notNull()
      .references(() => procurements.id),
    eventKey: text('event_key').notNull().unique(),
    message: text('message').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: created(),
  },
  (t) => [index('alerts_org_idx').on(t.organizationId)],
);
export const plans = pgTable('plans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  monthlyPrice: numeric('monthly_price', { precision: 12, scale: 2 }),
  entitlements: jsonb('entitlements').$type<Record<string, boolean | number | string>>().notNull(),
});
export const subscriptions = pgTable('subscriptions', {
  id: id(),
  organizationId: uuid('organization_id')
    .notNull()
    .unique()
    .references(() => organizations.id),
  planId: text('plan_id')
    .notNull()
    .references(() => plans.id),
  status: text('status').notNull().default('trial'),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  createdAt: created(),
});
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: id(),
    organizationId: uuid('organization_id').references(() => organizations.id),
    userId: uuid('user_id').references(() => users.id),
    action: text('action').notNull(),
    resourceId: text('resource_id'),
    correlationId: text('correlation_id'),
    createdAt: created(),
  },
  (t) => [index('audit_org_created_idx').on(t.organizationId, t.createdAt)],
);
export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: id(),
    type: text('type').notNull(),
    payload: jsonb('payload').notNull(),
    createdAt: created(),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
  },
  (t) => [index('outbox_dispatched_idx').on(t.dispatchedAt)],
);
export const documentExtractions = pgTable(
  'document_extractions',
  {
    id: id(),
    procurementId: uuid('procurement_id')
      .notNull()
      .references(() => procurements.id, { onDelete: 'cascade' }),
    sourceDocumentUrl: text('source_document_url').notNull(),
    name: text('name').notNull(),
    hash: text('hash').notNull(),
    pageCount: integer('page_count').notNull().default(1),
    extractedText: text('extracted_text').notNull(),
    sections: jsonb('sections').$type<Array<{ title: string; page?: number; content: string }>>(),
    createdAt: created(),
  },
  (t) => [
    index('doc_extract_procurement_idx').on(t.procurementId),
    uniqueIndex('doc_extract_hash_idx').on(t.procurementId, t.hash),
  ],
);
export const procurementAIAnalyses = pgTable(
  'procurement_ai_analyses',
  {
    id: id(),
    procurementId: uuid('procurement_id')
      .notNull()
      .references(() => procurements.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    status: text('status').$type<AIAnalysisStatus>().notNull().default('PENDING'),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    promptVersion: text('prompt_version').notNull(),
    summary: text('summary').notNull(),
    executionPlace: jsonb('execution_place').$type<ExecutionPlace>(),
    requirements: jsonb('requirements').$type<Requirement[]>().notNull(),
    risks: jsonb('risks').$type<RiskItem[]>().notNull(),
    unverifiedPoints: jsonb('unverified_points').$type<string[]>().notNull(),
    tokensUsed: integer('tokens_used').notNull().default(0),
    costUsd: numeric('cost_usd', { precision: 10, scale: 6 }).notNull().default('0'),
    error: text('error'),
    createdAt: created(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('ai_analysis_procurement_version').on(t.procurementId, t.version),
    index('ai_analysis_procurement_idx').on(t.procurementId),
    index('ai_analysis_status_idx').on(t.status),
  ],
);
export const opportunityBriefs = pgTable(
  'opportunity_briefs',
  {
    id: id(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => commercialProfiles.id, { onDelete: 'cascade' }),
    procurementId: uuid('procurement_id')
      .notNull()
      .references(() => procurements.id, { onDelete: 'cascade' }),
    status: text('status').$type<AIAnalysisStatus>().notNull().default('PENDING'),
    summary: text('summary').notNull(),
    commercialFit: jsonb('commercial_fit').notNull(),
    keyRequirements: jsonb('key_requirements').$type<Requirement[]>().notNull(),
    risksAndCautions: jsonb('risks_and_cautions').$type<RiskItem[]>().notNull(),
    unverifiedInformation: jsonb('unverified_information').$type<string[]>().notNull(),
    suggestedNextSteps: jsonb('suggested_next_steps').$type<string[]>().notNull(),
    officialLinks: jsonb('official_links').$type<Array<{ label: string; url: string }>>().notNull(),
    disclaimer: text('disclaimer').notNull(),
    createdAt: created(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('brief_org_profile_procurement').on(t.organizationId, t.profileId, t.procurementId),
    index('brief_org_idx').on(t.organizationId),
    index('brief_procurement_idx').on(t.procurementId),
  ],
);
export const aiUsageRecords = pgTable(
  'ai_usage_records',
  {
    id: id(),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    taskType: text('task_type').notNull(),
    procurementId: uuid('procurement_id').references(() => procurements.id),
    procurementVersion: integer('procurement_version'),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    totalTokens: integer('total_tokens').notNull().default(0),
    latencyMs: integer('latency_ms').notNull().default(0),
    costUsd: numeric('cost_usd', { precision: 12, scale: 6 }).notNull().default('0'),
    status: text('status').notNull(),
    errorMessage: text('error_message'),
    createdAt: created(),
  },
  (t) => [
    index('ai_usage_provider_created_idx').on(t.provider, t.createdAt),
    index('ai_usage_task_idx').on(t.taskType),
    index('ai_usage_procurement_idx').on(t.procurementId),
  ],
);

