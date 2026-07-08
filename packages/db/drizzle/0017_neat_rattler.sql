CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"logo_id" uuid,
	"order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"legacy_id" integer,
	"legacy_source" varchar(80),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"answer" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"category" varchar(160),
	"order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"legacy_id" integer,
	"legacy_source" varchar(80),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"role" varchar(200),
	"bio" text,
	"photo_id" uuid,
	"order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"legacy_id" integer,
	"legacy_source" varchar(80),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_name" varchar(200) NOT NULL,
	"author_role" varchar(200),
	"quote" text NOT NULL,
	"avatar_id" uuid,
	"order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"legacy_id" integer,
	"legacy_source" varchar(80),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "categories" RENAME COLUMN "payload_id" TO "legacy_id";--> statement-breakpoint
ALTER TABLE "leads" RENAME COLUMN "payload_id" TO "legacy_id";--> statement-breakpoint
ALTER TABLE "media_assets" RENAME COLUMN "payload_id" TO "legacy_id";--> statement-breakpoint
ALTER TABLE "pages" RENAME COLUMN "payload_id" TO "legacy_id";--> statement-breakpoint
ALTER TABLE "posts" RENAME COLUMN "payload_id" TO "legacy_id";--> statement-breakpoint
ALTER TABLE "projects" RENAME COLUMN "payload_id" TO "legacy_id";--> statement-breakpoint
ALTER TABLE "redirects" RENAME COLUMN "payload_id" TO "legacy_id";--> statement-breakpoint
ALTER TABLE "services" RENAME COLUMN "payload_id" TO "legacy_id";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "payload_id" TO "legacy_id";--> statement-breakpoint
DROP INDEX "categories_payload_id_idx";--> statement-breakpoint
DROP INDEX "leads_payload_id_idx";--> statement-breakpoint
DROP INDEX "media_assets_payload_id_idx";--> statement-breakpoint
DROP INDEX "pages_payload_id_idx";--> statement-breakpoint
DROP INDEX "posts_payload_id_idx";--> statement-breakpoint
DROP INDEX "projects_payload_id_idx";--> statement-breakpoint
DROP INDEX "redirects_payload_id_idx";--> statement-breakpoint
DROP INDEX "services_payload_id_idx";--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "legacy_source" varchar(80);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "legacy_source" varchar(80);--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "legacy_source" varchar(80);--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "legacy_source" varchar(80);--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "legacy_source" varchar(80);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "legacy_source" varchar(80);--> statement-breakpoint
ALTER TABLE "redirects" ADD COLUMN "legacy_source" varchar(80);--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "legacy_source" varchar(80);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "legacy_source" varchar(80);--> statement-breakpoint
UPDATE "categories" SET "legacy_source" = 'legacy' WHERE "legacy_id" IS NOT NULL AND "legacy_source" IS NULL;--> statement-breakpoint
UPDATE "leads" SET "legacy_source" = 'legacy' WHERE "legacy_id" IS NOT NULL AND "legacy_source" IS NULL;--> statement-breakpoint
UPDATE "media_assets" SET "legacy_source" = 'legacy' WHERE "legacy_id" IS NOT NULL AND "legacy_source" IS NULL;--> statement-breakpoint
UPDATE "pages" SET "legacy_source" = 'legacy' WHERE "legacy_id" IS NOT NULL AND "legacy_source" IS NULL;--> statement-breakpoint
UPDATE "posts" SET "legacy_source" = 'legacy' WHERE "legacy_id" IS NOT NULL AND "legacy_source" IS NULL;--> statement-breakpoint
UPDATE "projects" SET "legacy_source" = 'legacy' WHERE "legacy_id" IS NOT NULL AND "legacy_source" IS NULL;--> statement-breakpoint
UPDATE "redirects" SET "legacy_source" = 'legacy' WHERE "legacy_id" IS NOT NULL AND "legacy_source" IS NULL;--> statement-breakpoint
UPDATE "services" SET "legacy_source" = 'legacy' WHERE "legacy_id" IS NOT NULL AND "legacy_source" IS NULL;--> statement-breakpoint
UPDATE "users" SET "legacy_source" = 'legacy' WHERE "legacy_id" IS NOT NULL AND "legacy_source" IS NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_logo_id_media_assets_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_photo_id_media_assets_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_avatar_id_media_assets_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "clients_legacy_source_id_idx" ON "clients" USING btree ("legacy_source","legacy_id");--> statement-breakpoint
CREATE INDEX "clients_order_idx" ON "clients" USING btree ("order");--> statement-breakpoint
CREATE UNIQUE INDEX "faqs_legacy_source_id_idx" ON "faqs" USING btree ("legacy_source","legacy_id");--> statement-breakpoint
CREATE INDEX "faqs_order_idx" ON "faqs" USING btree ("order");--> statement-breakpoint
CREATE INDEX "faqs_category_idx" ON "faqs" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "team_members_legacy_source_id_idx" ON "team_members" USING btree ("legacy_source","legacy_id");--> statement-breakpoint
CREATE INDEX "team_members_order_idx" ON "team_members" USING btree ("order");--> statement-breakpoint
CREATE UNIQUE INDEX "testimonials_legacy_source_id_idx" ON "testimonials" USING btree ("legacy_source","legacy_id");--> statement-breakpoint
CREATE INDEX "testimonials_order_idx" ON "testimonials" USING btree ("order");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_legacy_source_id_idx" ON "categories" USING btree ("legacy_source","legacy_id");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_legacy_source_id_idx" ON "leads" USING btree ("legacy_source","legacy_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_legacy_source_id_idx" ON "media_assets" USING btree ("legacy_source","legacy_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_legacy_source_id_idx" ON "pages" USING btree ("legacy_source","legacy_id");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_legacy_source_id_idx" ON "posts" USING btree ("legacy_source","legacy_id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_legacy_source_id_idx" ON "projects" USING btree ("legacy_source","legacy_id");--> statement-breakpoint
CREATE UNIQUE INDEX "redirects_legacy_source_id_idx" ON "redirects" USING btree ("legacy_source","legacy_id");--> statement-breakpoint
CREATE UNIQUE INDEX "services_legacy_source_id_idx" ON "services" USING btree ("legacy_source","legacy_id");
