CREATE TABLE "booking_customizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"display_name_1" text,
	"display_name_2" text,
	"welcome_message" text,
	"signage_text" text,
	"client_notes" text,
	"max_prompts" integer NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_customizations_booking_id_unique" UNIQUE("booking_id"),
	CONSTRAINT "booking_customizations_max_prompts_positive" CHECK ("booking_customizations"."max_prompts" > 0)
);
--> statement-breakpoint
CREATE TABLE "booking_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"prompt_text" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_prompts_booking_id_sort_order_unique" UNIQUE("booking_id","sort_order"),
	CONSTRAINT "booking_prompts_sort_order_nonnegative" CHECK ("booking_prompts"."sort_order" >= 0),
	CONSTRAINT "booking_prompts_prompt_text_nonempty" CHECK (trim("booking_prompts"."prompt_text") <> '')
);
--> statement-breakpoint
ALTER TABLE "booking_customizations" ADD CONSTRAINT "booking_customizations_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_prompts" ADD CONSTRAINT "booking_prompts_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_prompts_booking_id_idx" ON "booking_prompts" USING btree ("booking_id");