CREATE TYPE "public"."media_storage_status" AS ENUM('pending', 'uploaded', 'failed', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('original', 'web', 'highlight', 'delivery_archive', 'other');--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"source_media_asset_id" uuid,
	"media_type" "media_type" NOT NULL,
	"storage_status" "media_storage_status" DEFAULT 'pending' NOT NULL,
	"r2_object_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"display_name" text,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"duration_seconds" integer,
	"is_visible" boolean DEFAULT false NOT NULL,
	"is_downloadable" boolean DEFAULT false NOT NULL,
	"retention_expires_at" timestamp with time zone,
	"storage_deleted_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"uploaded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_r2_object_key_unique" UNIQUE("r2_object_key"),
	CONSTRAINT "media_assets_id_booking_id_unique" UNIQUE("id","booking_id"),
	CONSTRAINT "media_assets_size_bytes_nonnegative" CHECK ("media_assets"."size_bytes" >= 0),
	CONSTRAINT "media_assets_duration_seconds_nonnegative" CHECK ("media_assets"."duration_seconds" IS NULL OR "media_assets"."duration_seconds" >= 0),
	CONSTRAINT "media_assets_sort_order_nonnegative" CHECK ("media_assets"."sort_order" >= 0),
	CONSTRAINT "media_assets_r2_object_key_nonempty" CHECK (trim("media_assets"."r2_object_key") <> ''),
	CONSTRAINT "media_assets_source_not_self" CHECK ("media_assets"."source_media_asset_id" IS NULL OR "media_assets"."source_media_asset_id" <> "media_assets"."id"),
	CONSTRAINT "media_assets_uploaded_requires_uploaded_at" CHECK ("media_assets"."storage_status" <> 'uploaded' OR "media_assets"."uploaded_at" IS NOT NULL),
	CONSTRAINT "media_assets_deleted_requires_deleted_at" CHECK ("media_assets"."storage_status" <> 'deleted' OR "media_assets"."storage_deleted_at" IS NOT NULL),
	CONSTRAINT "media_assets_non_deleted_has_no_deleted_at" CHECK ("media_assets"."storage_status" = 'deleted' OR "media_assets"."storage_deleted_at" IS NULL),
	CONSTRAINT "media_assets_visible_requires_uploaded" CHECK ("media_assets"."is_visible" = false OR "media_assets"."storage_status" = 'uploaded')
);
--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_source_same_booking_fk" FOREIGN KEY ("source_media_asset_id","booking_id") REFERENCES "public"."media_assets"("id","booking_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_assets_booking_visible_sort_idx" ON "media_assets" USING btree ("booking_id","is_visible","sort_order");--> statement-breakpoint
CREATE INDEX "media_assets_booking_media_type_idx" ON "media_assets" USING btree ("booking_id","media_type");--> statement-breakpoint
CREATE INDEX "media_assets_booking_storage_status_idx" ON "media_assets" USING btree ("booking_id","storage_status");--> statement-breakpoint
CREATE INDEX "media_assets_retention_expires_at_idx" ON "media_assets" USING btree ("retention_expires_at");--> statement-breakpoint
CREATE INDEX "media_assets_source_media_asset_id_idx" ON "media_assets" USING btree ("source_media_asset_id");