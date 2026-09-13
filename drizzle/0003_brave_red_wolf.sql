CREATE TABLE "client_magic_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_magic_links_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "client_magic_links_token_hash_format" CHECK ("client_magic_links"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "client_magic_links_expires_after_created" CHECK ("client_magic_links"."expires_at" > "client_magic_links"."created_at"),
	CONSTRAINT "client_magic_links_used_after_created" CHECK ("client_magic_links"."used_at" IS NULL OR "client_magic_links"."used_at" >= "client_magic_links"."created_at"),
	CONSTRAINT "client_magic_links_revoked_after_created" CHECK ("client_magic_links"."revoked_at" IS NULL OR "client_magic_links"."revoked_at" >= "client_magic_links"."created_at")
);
--> statement-breakpoint
CREATE TABLE "client_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"session_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_sessions_session_hash_unique" UNIQUE("session_hash"),
	CONSTRAINT "client_sessions_session_hash_format" CHECK ("client_sessions"."session_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "client_sessions_expires_after_created" CHECK ("client_sessions"."expires_at" > "client_sessions"."created_at"),
	CONSTRAINT "client_sessions_last_seen_after_created" CHECK ("client_sessions"."last_seen_at" IS NULL OR "client_sessions"."last_seen_at" >= "client_sessions"."created_at"),
	CONSTRAINT "client_sessions_revoked_after_created" CHECK ("client_sessions"."revoked_at" IS NULL OR "client_sessions"."revoked_at" >= "client_sessions"."created_at")
);
--> statement-breakpoint
ALTER TABLE "client_magic_links" ADD CONSTRAINT "client_magic_links_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_sessions" ADD CONSTRAINT "client_sessions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_magic_links_token_hash_idx" ON "client_magic_links" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "client_magic_links_booking_id_idx" ON "client_magic_links" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "client_magic_links_expires_at_idx" ON "client_magic_links" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "client_sessions_session_hash_idx" ON "client_sessions" USING btree ("session_hash");--> statement-breakpoint
CREATE INDEX "client_sessions_booking_id_idx" ON "client_sessions" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "client_sessions_expires_at_idx" ON "client_sessions" USING btree ("expires_at");