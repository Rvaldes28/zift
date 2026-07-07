CREATE TABLE "security_ip_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_address" varchar(80) NOT NULL,
	"reason" text NOT NULL,
	"blocked_until" timestamp with time zone NOT NULL,
	"created_by" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "revoked_by" uuid;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "revocation_reason" varchar(120);--> statement-breakpoint
CREATE INDEX "security_ip_blocks_ip_address_idx" ON "security_ip_blocks" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "security_ip_blocks_blocked_until_idx" ON "security_ip_blocks" USING btree ("blocked_until");--> statement-breakpoint
CREATE INDEX "security_ip_blocks_created_by_idx" ON "security_ip_blocks" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "sessions_last_seen_at_idx" ON "sessions" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "sessions_revoked_at_idx" ON "sessions" USING btree ("revoked_at");