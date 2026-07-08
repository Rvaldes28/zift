CREATE TABLE "integration_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid,
	"integration_key" varchar(120) NOT NULL,
	"action" varchar(160) NOT NULL,
	"level" varchar(40) DEFAULT 'info' NOT NULL,
	"status" varchar(40) DEFAULT 'ok' NOT NULL,
	"message" text,
	"request_id" varchar(160),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "category" varchar(80) DEFAULT 'external' NOT NULL;--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "provider" varchar(120) DEFAULT 'custom' NOT NULL;--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "status" varchar(40) DEFAULT 'not_configured' NOT NULL;--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "environment" varchar(40) DEFAULT 'live' NOT NULL;--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "docs_url" text;--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "last_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "last_error" text;--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "integration_logs_integration_id_idx" ON "integration_logs" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX "integration_logs_integration_key_idx" ON "integration_logs" USING btree ("integration_key");--> statement-breakpoint
CREATE INDEX "integration_logs_action_idx" ON "integration_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "integration_logs_status_idx" ON "integration_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "integration_logs_created_at_idx" ON "integration_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "integrations_category_idx" ON "integrations" USING btree ("category");--> statement-breakpoint
CREATE INDEX "integrations_provider_idx" ON "integrations" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "integrations_status_idx" ON "integrations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "integrations_enabled_idx" ON "integrations" USING btree ("enabled");