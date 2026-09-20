CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed', 'cancelled', 'partially_refunded', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('deposit', 'balance', 'addon', 'other');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"payment_type" "payment_type" NOT NULL,
	"status" "payment_status" NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"stripe_invoice_id" text,
	"paid_at" timestamp with time zone,
	"refunded_cents" integer DEFAULT 0 NOT NULL,
	"manual_review_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_stripe_checkout_session_id_unique" UNIQUE("stripe_checkout_session_id"),
	CONSTRAINT "payments_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id"),
	CONSTRAINT "payments_amount_cents_positive" CHECK ("payments"."amount_cents" > 0),
	CONSTRAINT "payments_refunded_cents_nonnegative" CHECK ("payments"."refunded_cents" >= 0),
	CONSTRAINT "payments_refunded_cents_within_amount" CHECK ("payments"."refunded_cents" <= "payments"."amount_cents"),
	CONSTRAINT "payments_paid_requires_paid_at" CHECK ("payments"."status" <> 'paid' OR ("payments"."paid_at" IS NOT NULL AND "payments"."refunded_cents" = 0)),
	CONSTRAINT "payments_partially_refunded_requires_fields" CHECK ("payments"."status" <> 'partially_refunded' OR ("payments"."paid_at" IS NOT NULL AND "payments"."refunded_cents" > 0 AND "payments"."refunded_cents" < "payments"."amount_cents")),
	CONSTRAINT "payments_refunded_requires_fields" CHECK ("payments"."status" <> 'refunded' OR ("payments"."paid_at" IS NOT NULL AND "payments"."refunded_cents" = "payments"."amount_cents")),
	CONSTRAINT "payments_unpaid_has_no_refunds" CHECK ("payments"."status" NOT IN ('pending', 'failed', 'cancelled') OR "payments"."refunded_cents" = 0)
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"stripe_event_id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"api_version" text,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"booking_id" uuid,
	"payload_reference" text
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_events" ADD CONSTRAINT "stripe_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_booking_id_status_idx" ON "payments" USING btree ("booking_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_one_pending_per_booking_type" ON "payments" USING btree ("booking_id","payment_type") WHERE "payments"."status" = 'pending';