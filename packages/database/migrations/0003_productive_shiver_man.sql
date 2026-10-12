ALTER TABLE "opportunity_briefs" ADD COLUMN "decision_blocks" jsonb;--> statement-breakpoint
ALTER TABLE "opportunity_briefs" ADD COLUMN "document_coverage" jsonb;--> statement-breakpoint
ALTER TABLE "procurement_ai_analyses" ADD COLUMN "decision_blocks" jsonb;--> statement-breakpoint
ALTER TABLE "procurement_ai_analyses" ADD COLUMN "document_coverage" jsonb;