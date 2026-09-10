CREATE TYPE "public"."booking_status" AS ENUM('hold', 'confirmed', 'expired', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."line_item_type" AS ENUM('package', 'addon', 'adjustment', 'discount', 'travel', 'other');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('hold', 'confirmed');--> statement-breakpoint
CREATE TABLE "booking_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"item_type" "line_item_type" NOT NULL,
	"catalog_key" text,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"line_total_cents" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_line_items_quantity_positive" CHECK ("booking_line_items"."quantity" > 0),
	CONSTRAINT "booking_line_items_sort_order_nonnegative" CHECK ("booking_line_items"."sort_order" >= 0),
	CONSTRAINT "booking_line_items_description_nonempty" CHECK (trim("booking_line_items"."description") <> ''),
	CONSTRAINT "booking_line_items_line_total_matches" CHECK ("booking_line_items"."line_total_cents" = "booking_line_items"."quantity" * "booking_line_items"."unit_price_cents"),
	CONSTRAINT "booking_line_items_nonnegative_unless_discount" CHECK ("booking_line_items"."item_type" NOT IN ('package', 'addon', 'travel', 'other') OR "booking_line_items"."unit_price_cents" >= 0),
	CONSTRAINT "booking_line_items_discount_nonpositive" CHECK ("booking_line_items"."item_type" <> 'discount' OR "booking_line_items"."unit_price_cents" <= 0)
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid,
	"reference_code" text NOT NULL,
	"primary_contact_name" text NOT NULL,
	"partner_name" text,
	"email" text NOT NULL,
	"phone" text,
	"event_type" text DEFAULT 'wedding' NOT NULL,
	"event_date" date NOT NULL,
	"event_timezone" text DEFAULT 'America/Los_Angeles' NOT NULL,
	"venue_name" text,
	"venue_address_line1" text,
	"venue_address_line2" text,
	"venue_city" text,
	"venue_state" text,
	"venue_postal_code" text,
	"internal_notes" text,
	"status" "booking_status" NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"required_retainer_cents" integer NOT NULL,
	"customization_due_at" timestamp with time zone,
	"customization_locked_at" timestamp with time zone,
	"balance_due_at" timestamp with time zone,
	"gallery_published_at" timestamp with time zone,
	"gallery_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "bookings_inquiry_id_unique" UNIQUE("inquiry_id"),
	CONSTRAINT "bookings_reference_code_unique" UNIQUE("reference_code"),
	CONSTRAINT "bookings_id_event_date_unique" UNIQUE("id","event_date"),
	CONSTRAINT "bookings_reference_code_format" CHECK ("bookings"."reference_code" ~ '^MS-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{7}$'),
	CONSTRAINT "bookings_subtotal_cents_nonnegative" CHECK ("bookings"."subtotal_cents" >= 0),
	CONSTRAINT "bookings_total_cents_nonnegative" CHECK ("bookings"."total_cents" >= 0),
	CONSTRAINT "bookings_required_retainer_cents_nonnegative" CHECK ("bookings"."required_retainer_cents" >= 0),
	CONSTRAINT "bookings_confirmed_requires_confirmed_at" CHECK ("bookings"."status" <> 'confirmed' OR "bookings"."confirmed_at" IS NOT NULL),
	CONSTRAINT "bookings_expired_requires_expired_at" CHECK ("bookings"."status" <> 'expired' OR "bookings"."expired_at" IS NOT NULL),
	CONSTRAINT "bookings_cancelled_requires_cancelled_at" CHECK ("bookings"."status" <> 'cancelled' OR "bookings"."cancelled_at" IS NOT NULL),
	CONSTRAINT "bookings_completed_requires_fields" CHECK ("bookings"."status" <> 'completed' OR ("bookings"."confirmed_at" IS NOT NULL AND "bookings"."completed_at" IS NOT NULL AND "bookings"."gallery_published_at" IS NOT NULL)),
	CONSTRAINT "bookings_gallery_expires_requires_published" CHECK ("bookings"."gallery_expires_at" IS NULL OR "bookings"."gallery_published_at" IS NOT NULL),
	CONSTRAINT "bookings_gallery_expires_after_published" CHECK ("bookings"."gallery_expires_at" IS NULL OR "bookings"."gallery_expires_at" > "bookings"."gallery_published_at"),
	CONSTRAINT "bookings_hold_retainer_is_30_percent" CHECK ("bookings"."status" <> 'hold' OR "bookings"."required_retainer_cents" = round("bookings"."total_cents" * 0.30))
);
--> statement-breakpoint
CREATE TABLE "date_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"event_date" date NOT NULL,
	"status" "reservation_status" NOT NULL,
	"hold_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	CONSTRAINT "date_reservations_booking_id_unique" UNIQUE("booking_id"),
	CONSTRAINT "date_reservations_event_date_unique" UNIQUE("event_date"),
	CONSTRAINT "date_reservations_hold_requires_fields" CHECK ("date_reservations"."status" <> 'hold' OR ("date_reservations"."hold_expires_at" IS NOT NULL AND "date_reservations"."confirmed_at" IS NULL)),
	CONSTRAINT "date_reservations_confirmed_requires_fields" CHECK ("date_reservations"."status" <> 'confirmed' OR ("date_reservations"."hold_expires_at" IS NULL AND "date_reservations"."confirmed_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "booking_line_items" ADD CONSTRAINT "booking_line_items_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_reservations" ADD CONSTRAINT "date_reservations_booking_event_date_fk" FOREIGN KEY ("booking_id","event_date") REFERENCES "public"."bookings"("id","event_date") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "booking_line_items_one_package_per_booking" ON "booking_line_items" USING btree ("booking_id") WHERE "booking_line_items"."item_type" = 'package';--> statement-breakpoint
CREATE INDEX "bookings_event_date_idx" ON "bookings" USING btree ("event_date");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bookings_status_event_date_idx" ON "bookings" USING btree ("status","event_date");--> statement-breakpoint
CREATE INDEX "bookings_email_lower_idx" ON "bookings" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "bookings_created_at_idx" ON "bookings" USING btree ("created_at" DESC NULLS LAST);