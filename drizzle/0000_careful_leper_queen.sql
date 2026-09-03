CREATE TYPE "public"."inquiry_status" AS ENUM('new', 'reviewing', 'waitlisted', 'declined', 'converted');--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text,
	"partner_first_name" text,
	"partner_last_name" text,
	"email" text NOT NULL,
	"phone" text,
	"event_type" text DEFAULT 'wedding' NOT NULL,
	"event_date" date NOT NULL,
	"venue_name" text,
	"venue_city" text,
	"venue_state" text,
	"estimated_guest_count" integer,
	"package_interest" text,
	"message" text,
	"lead_source" text,
	"status" "inquiry_status" DEFAULT 'new' NOT NULL,
	"retention_expires_at" timestamp with time zone,
	"anonymized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "inquiries_event_date_idx" ON "inquiries" USING btree ("event_date");--> statement-breakpoint
CREATE INDEX "inquiries_status_idx" ON "inquiries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inquiries_email_lower_idx" ON "inquiries" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "inquiries_created_at_idx" ON "inquiries" USING btree ("created_at" DESC NULLS LAST);