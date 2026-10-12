CREATE TABLE "ai_usage_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"task_type" text NOT NULL,
	"procurement_id" uuid,
	"procurement_version" integer,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(12, 6) DEFAULT '0' NOT NULL,
	"status" text NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_extractions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"procurement_id" uuid NOT NULL,
	"source_document_url" text NOT NULL,
	"name" text NOT NULL,
	"hash" text NOT NULL,
	"page_count" integer DEFAULT 1 NOT NULL,
	"extracted_text" text NOT NULL,
	"sections" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"procurement_id" uuid NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"summary" text NOT NULL,
	"commercial_fit" jsonb NOT NULL,
	"key_requirements" jsonb NOT NULL,
	"risks_and_cautions" jsonb NOT NULL,
	"unverified_information" jsonb NOT NULL,
	"suggested_next_steps" jsonb NOT NULL,
	"official_links" jsonb NOT NULL,
	"disclaimer" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procurement_ai_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"procurement_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"summary" text NOT NULL,
	"execution_place" jsonb,
	"requirements" jsonb NOT NULL,
	"risks" jsonb NOT NULL,
	"unverified_points" jsonb NOT NULL,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(10, 6) DEFAULT '0' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_usage_records" ADD CONSTRAINT "ai_usage_records_procurement_id_procurements_id_fk" FOREIGN KEY ("procurement_id") REFERENCES "public"."procurements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extractions" ADD CONSTRAINT "document_extractions_procurement_id_procurements_id_fk" FOREIGN KEY ("procurement_id") REFERENCES "public"."procurements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_briefs" ADD CONSTRAINT "opportunity_briefs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_briefs" ADD CONSTRAINT "opportunity_briefs_profile_id_commercial_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."commercial_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_briefs" ADD CONSTRAINT "opportunity_briefs_procurement_id_procurements_id_fk" FOREIGN KEY ("procurement_id") REFERENCES "public"."procurements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procurement_ai_analyses" ADD CONSTRAINT "procurement_ai_analyses_procurement_id_procurements_id_fk" FOREIGN KEY ("procurement_id") REFERENCES "public"."procurements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_provider_created_idx" ON "ai_usage_records" USING btree ("provider","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_task_idx" ON "ai_usage_records" USING btree ("task_type");--> statement-breakpoint
CREATE INDEX "ai_usage_procurement_idx" ON "ai_usage_records" USING btree ("procurement_id");--> statement-breakpoint
CREATE INDEX "doc_extract_procurement_idx" ON "document_extractions" USING btree ("procurement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "doc_extract_hash_idx" ON "document_extractions" USING btree ("procurement_id","hash");--> statement-breakpoint
CREATE UNIQUE INDEX "brief_org_profile_procurement" ON "opportunity_briefs" USING btree ("organization_id","profile_id","procurement_id");--> statement-breakpoint
CREATE INDEX "brief_org_idx" ON "opportunity_briefs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "brief_procurement_idx" ON "opportunity_briefs" USING btree ("procurement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_analysis_procurement_version" ON "procurement_ai_analyses" USING btree ("procurement_id","version");--> statement-breakpoint
CREATE INDEX "ai_analysis_procurement_idx" ON "procurement_ai_analyses" USING btree ("procurement_id");--> statement-breakpoint
CREATE INDEX "ai_analysis_status_idx" ON "procurement_ai_analyses" USING btree ("status");