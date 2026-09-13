CREATE TYPE "public"."contract_status" AS ENUM('draft', 'signed', 'superseded');--> statement-breakpoint
CREATE TABLE "contract_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" text NOT NULL,
	"name" text NOT NULL,
	"source_format" text NOT NULL,
	"source_content" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contract_templates_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"template_id" uuid,
	"version_number" integer NOT NULL,
	"status" "contract_status" NOT NULL,
	"rendered_content" text NOT NULL,
	"content_hash" text NOT NULL,
	"booking_total_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"signed_name" text,
	"signed_email" text,
	"accepted" boolean DEFAULT false NOT NULL,
	"signed_at" timestamp with time zone,
	"signed_ip" "inet",
	"signed_user_agent" text,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contracts_booking_id_version_number_unique" UNIQUE("booking_id","version_number"),
	CONSTRAINT "contracts_version_number_positive" CHECK ("contracts"."version_number" > 0),
	CONSTRAINT "contracts_booking_total_cents_nonnegative" CHECK ("contracts"."booking_total_cents" >= 0),
	CONSTRAINT "contracts_content_hash_format" CHECK ("contracts"."content_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "contracts_signed_requires_fields" CHECK ("contracts"."status" <> 'signed' OR ("contracts"."accepted" = true AND "contracts"."signed_at" IS NOT NULL AND "contracts"."signed_name" IS NOT NULL AND "contracts"."signed_email" IS NOT NULL)),
	CONSTRAINT "contracts_superseded_requires_superseded_at" CHECK ("contracts"."status" <> 'superseded' OR "contracts"."superseded_at" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_template_id_contract_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."contract_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contract_templates_one_active_template" ON "contract_templates" USING btree ("is_active") WHERE "contract_templates"."is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "contracts_one_current_per_booking" ON "contracts" USING btree ("booking_id") WHERE "contracts"."status" <> 'superseded';--> statement-breakpoint
CREATE INDEX "contracts_booking_id_status_idx" ON "contracts" USING btree ("booking_id","status");