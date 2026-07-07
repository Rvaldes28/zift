ALTER TABLE "seo_metadata" ADD COLUMN "og_title" varchar(140);--> statement-breakpoint
ALTER TABLE "seo_metadata" ADD COLUMN "og_description" text;--> statement-breakpoint
ALTER TABLE "seo_metadata" ADD COLUMN "og_image_id" uuid;--> statement-breakpoint
ALTER TABLE "seo_metadata" ADD COLUMN "schema_json_ld" jsonb;--> statement-breakpoint
ALTER TABLE "seo_metadata" ADD COLUMN "robots_directives" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "seo_metadata" ADD COLUMN "sitemap_include" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "seo_metadata" ADD CONSTRAINT "seo_metadata_og_image_id_media_assets_id_fk" FOREIGN KEY ("og_image_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "redirects_active_idx" ON "redirects" USING btree ("active");--> statement-breakpoint
CREATE INDEX "redirects_status_code_idx" ON "redirects" USING btree ("status_code");--> statement-breakpoint
CREATE UNIQUE INDEX "seo_metadata_entity_idx" ON "seo_metadata" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "seo_metadata_entity_type_idx" ON "seo_metadata" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "seo_metadata_noindex_idx" ON "seo_metadata" USING btree ("noindex");--> statement-breakpoint
CREATE INDEX "seo_metadata_sitemap_include_idx" ON "seo_metadata" USING btree ("sitemap_include");