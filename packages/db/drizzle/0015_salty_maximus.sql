ALTER TABLE "activity_logs" ADD COLUMN "actor_email" varchar(254);--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "actor_name" varchar(200);--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "severity" varchar(40) DEFAULT 'info' NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "source" varchar(80) DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "session_id" uuid;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "ip_address" varchar(80);--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "route" varchar(320);--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "request_id" varchar(120);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "actor_email" varchar(254);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "actor_name" varchar(200);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "severity" varchar(40) DEFAULT 'info' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "source" varchar(80) DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "session_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "ip_address" varchar(80);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "route" varchar(320);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "request_id" varchar(120);--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "activity_logs_actor_id_idx" ON "activity_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "activity_logs_action_idx" ON "activity_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "activity_logs_entity_idx" ON "activity_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "activity_logs_severity_idx" ON "activity_logs" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "activity_logs_ip_address_idx" ON "activity_logs" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "activity_logs_session_id_idx" ON "activity_logs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "activity_logs_request_id_idx" ON "activity_logs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_target_idx" ON "audit_logs" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "audit_logs_severity_idx" ON "audit_logs" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "audit_logs_ip_address_idx" ON "audit_logs" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "audit_logs_session_id_idx" ON "audit_logs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "audit_logs_request_id_idx" ON "audit_logs" USING btree ("request_id");