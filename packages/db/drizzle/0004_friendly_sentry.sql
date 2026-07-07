ALTER TABLE "media_assets" ADD COLUMN "storage_key" text;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "bucket" varchar(160);--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "caption" text;--> statement-breakpoint
ALTER TABLE "page_sections" ADD COLUMN "label" varchar(160) DEFAULT 'Seccion' NOT NULL;--> statement-breakpoint
ALTER TABLE "page_sections" ADD COLUMN "enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "page_sections" ADD COLUMN "settings" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "route_path" varchar(260) DEFAULT '/' NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "excerpt" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "scheduled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "current_version_id" uuid;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "published_version_id" uuid;--> statement-breakpoint
CREATE INDEX "page_sections_page_id_idx" ON "page_sections" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "page_sections_position_idx" ON "page_sections" USING btree ("position");--> statement-breakpoint
CREATE UNIQUE INDEX "page_versions_page_version_idx" ON "page_versions" USING btree ("page_id","version");--> statement-breakpoint
CREATE INDEX "page_versions_page_id_idx" ON "page_versions" USING btree ("page_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_route_path_idx" ON "pages" USING btree ("route_path");--> statement-breakpoint
CREATE INDEX "pages_status_idx" ON "pages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pages_type_idx" ON "pages" USING btree ("type");