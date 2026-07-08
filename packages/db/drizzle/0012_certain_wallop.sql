CREATE TABLE "backup_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"backup_id" uuid NOT NULL,
	"level" varchar(40) DEFAULT 'info' NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "backups" ADD COLUMN "scope" varchar(40) DEFAULT 'database' NOT NULL;--> statement-breakpoint
ALTER TABLE "backups" ADD COLUMN "trigger" varchar(40) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "backups" ADD COLUMN "storage_key" text;--> statement-breakpoint
ALTER TABLE "backups" ADD COLUMN "bucket" varchar(160);--> statement-breakpoint
ALTER TABLE "backups" ADD COLUMN "filename" varchar(260);--> statement-breakpoint
ALTER TABLE "backups" ADD COLUMN "mime_type" varchar(120);--> statement-breakpoint
ALTER TABLE "backups" ADD COLUMN "filesize" integer;--> statement-breakpoint
ALTER TABLE "backups" ADD COLUMN "checksum" varchar(128);--> statement-breakpoint
ALTER TABLE "backups" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "backups" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "backups" ADD COLUMN "restored_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "backups" ADD COLUMN "restored_by" uuid;--> statement-breakpoint
ALTER TABLE "backups" ADD COLUMN "restore_source_id" uuid;--> statement-breakpoint
ALTER TABLE "backup_logs" ADD CONSTRAINT "backup_logs_backup_id_backups_id_fk" FOREIGN KEY ("backup_id") REFERENCES "public"."backups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "backup_logs_backup_id_idx" ON "backup_logs" USING btree ("backup_id");--> statement-breakpoint
CREATE INDEX "backup_logs_level_idx" ON "backup_logs" USING btree ("level");--> statement-breakpoint
CREATE INDEX "backup_logs_created_at_idx" ON "backup_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "backups_scope_idx" ON "backups" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "backups_trigger_idx" ON "backups" USING btree ("trigger");--> statement-breakpoint
CREATE INDEX "backups_status_idx" ON "backups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "backups_created_by_idx" ON "backups" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "backups_started_at_idx" ON "backups" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "backups_restore_source_id_idx" ON "backups" USING btree ("restore_source_id");