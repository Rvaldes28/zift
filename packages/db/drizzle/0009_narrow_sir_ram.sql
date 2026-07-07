ALTER TABLE "analytics_events" ADD COLUMN "path" text;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "referrer" text;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "utm" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "session_id_hash" varchar(128);--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "visitor_id_hash" varchar(128);--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "device_type" varchar(40);--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "browser" varchar(80);--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "os" varchar(80);--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "country" varchar(120);--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "city" varchar(160);--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "duration_ms" integer;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "analytics_session_id_hash" varchar(128);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "landing_path" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "referrer" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "device_type" varchar(40);--> statement-breakpoint
CREATE INDEX "analytics_events_event_name_idx" ON "analytics_events" USING btree ("event_name");--> statement-breakpoint
CREATE INDEX "analytics_events_occurred_at_idx" ON "analytics_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_events_path_idx" ON "analytics_events" USING btree ("path");--> statement-breakpoint
CREATE INDEX "analytics_events_source_idx" ON "analytics_events" USING btree ("source");--> statement-breakpoint
CREATE INDEX "analytics_events_session_id_hash_idx" ON "analytics_events" USING btree ("session_id_hash");--> statement-breakpoint
CREATE INDEX "analytics_events_country_idx" ON "analytics_events" USING btree ("country");--> statement-breakpoint
CREATE INDEX "analytics_events_city_idx" ON "analytics_events" USING btree ("city");--> statement-breakpoint
CREATE INDEX "analytics_events_device_type_idx" ON "analytics_events" USING btree ("device_type");--> statement-breakpoint
CREATE INDEX "leads_analytics_session_id_hash_idx" ON "leads" USING btree ("analytics_session_id_hash");--> statement-breakpoint
CREATE INDEX "leads_landing_path_idx" ON "leads" USING btree ("landing_path");