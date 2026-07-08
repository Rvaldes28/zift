CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"channel" varchar(40) NOT NULL,
	"status" varchar(40) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"response" jsonb,
	"error_message" text,
	"last_attempt_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"label" varchar(180) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"severity" varchar(40) DEFAULT 'info' NOT NULL,
	"channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dedupe_minutes" integer DEFAULT 15 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"status" varchar(40) DEFAULT 'active' NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "event_type" varchar(120) DEFAULT 'system.info' NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "severity" varchar(40) DEFAULT 'info' NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "status" varchar(40) DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "source" varchar(120) DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "entity_type" varchar(120);--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "entity_id" varchar(160);--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "dedupe_key" varchar(240);--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "channels" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "acknowledged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_deliveries_notification_id_idx" ON "notification_deliveries" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "notification_deliveries_channel_idx" ON "notification_deliveries" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "notification_deliveries_status_idx" ON "notification_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notification_deliveries_last_attempt_at_idx" ON "notification_deliveries" USING btree ("last_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_rules_event_type_idx" ON "notification_rules" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "notification_rules_enabled_idx" ON "notification_rules" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "notification_rules_severity_idx" ON "notification_rules" USING btree ("severity");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_idx" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_subscriptions_status_idx" ON "push_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "push_subscriptions_last_seen_at_idx" ON "push_subscriptions" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "notifications_event_type_idx" ON "notifications" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "notifications_severity_idx" ON "notifications" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "notifications_status_idx" ON "notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_source_idx" ON "notifications" USING btree ("source");--> statement-breakpoint
CREATE INDEX "notifications_entity_idx" ON "notifications" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "notifications_dedupe_key_idx" ON "notifications" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");