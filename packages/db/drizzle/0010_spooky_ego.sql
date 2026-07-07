CREATE TABLE "performance_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"severity" varchar(40) DEFAULT 'warning' NOT NULL,
	"status" varchar(40) DEFAULT 'open' NOT NULL,
	"title" varchar(240) NOT NULL,
	"message" text NOT NULL,
	"url" text,
	"metric" varchar(120),
	"value" integer,
	"threshold" integer,
	"source" varchar(120) DEFAULT 'performance' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "performance_checks" ADD COLUMN "kind" varchar(80) DEFAULT 'synthetic' NOT NULL;--> statement-breakpoint
ALTER TABLE "performance_checks" ADD COLUMN "status" varchar(40) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "performance_checks" ADD COLUMN "method" varchar(12) DEFAULT 'GET' NOT NULL;--> statement-breakpoint
ALTER TABLE "performance_checks" ADD COLUMN "http_status" integer;--> statement-breakpoint
ALTER TABLE "performance_checks" ADD COLUMN "response_time_ms" integer;--> statement-breakpoint
ALTER TABLE "performance_checks" ADD COLUMN "cache_status" varchar(160);--> statement-breakpoint
ALTER TABLE "performance_checks" ADD COLUMN "cdn_status" varchar(160);--> statement-breakpoint
ALTER TABLE "performance_checks" ADD COLUMN "error_message" text;--> statement-breakpoint
CREATE INDEX "performance_alerts_severity_idx" ON "performance_alerts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "performance_alerts_status_idx" ON "performance_alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "performance_alerts_source_idx" ON "performance_alerts" USING btree ("source");--> statement-breakpoint
CREATE INDEX "performance_alerts_url_idx" ON "performance_alerts" USING btree ("url");--> statement-breakpoint
CREATE INDEX "performance_alerts_metric_idx" ON "performance_alerts" USING btree ("metric");--> statement-breakpoint
CREATE INDEX "performance_alerts_last_seen_at_idx" ON "performance_alerts" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "performance_checks_kind_idx" ON "performance_checks" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "performance_checks_status_idx" ON "performance_checks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "performance_checks_url_idx" ON "performance_checks" USING btree ("url");--> statement-breakpoint
CREATE INDEX "performance_checks_response_time_ms_idx" ON "performance_checks" USING btree ("response_time_ms");--> statement-breakpoint
CREATE INDEX "performance_checks_checked_at_idx" ON "performance_checks" USING btree ("checked_at");