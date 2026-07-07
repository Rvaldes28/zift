ALTER TABLE "media_assets" ADD COLUMN "folder_path" varchar(260) DEFAULT '/' NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "status" varchar(40) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "checksum" varchar(128);--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "replaced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "replaced_by_id" uuid;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "deleted_reason" text;--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_storage_key_idx" ON "media_assets" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "media_assets_folder_path_idx" ON "media_assets" USING btree ("folder_path");--> statement-breakpoint
CREATE INDEX "media_assets_status_idx" ON "media_assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "media_assets_mime_type_idx" ON "media_assets" USING btree ("mime_type");--> statement-breakpoint
CREATE INDEX "media_assets_created_at_idx" ON "media_assets" USING btree ("created_at");