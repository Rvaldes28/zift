ALTER TABLE "leads" ADD COLUMN "assigned_to" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "status_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "crm_status" varchar(40);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "crm_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "crm_response" jsonb;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "notification_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "ip_address" varchar(80);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "spam_reason" text;--> statement-breakpoint
UPDATE "lead_notes" SET "author_id" = NULL WHERE "author_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "users" WHERE "users"."id" = "lead_notes"."author_id");--> statement-breakpoint
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_notes_lead_id_idx" ON "lead_notes" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_notes_author_id_idx" ON "lead_notes" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_assigned_to_idx" ON "leads" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "leads_service_id_idx" ON "leads" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "leads_form_type_idx" ON "leads" USING btree ("form_type");--> statement-breakpoint
CREATE INDEX "leads_email_idx" ON "leads" USING btree ("email");
