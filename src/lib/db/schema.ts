import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  inet,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const inquiryStatusEnum = pgEnum("inquiry_status", [
  "new",
  "reviewing",
  "waitlisted",
  "declined",
  "converted",
]);

export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    partnerFirstName: text("partner_first_name"),
    partnerLastName: text("partner_last_name"),

    email: text("email").notNull(),
    phone: text("phone"),

    eventType: text("event_type").notNull().default("wedding"),
    eventDate: date("event_date").notNull(),
    venueName: text("venue_name"),
    venueCity: text("venue_city"),
    venueState: text("venue_state"),
    estimatedGuestCount: integer("estimated_guest_count"),

    packageInterest: text("package_interest"),
    message: text("message"),
    leadSource: text("lead_source"),

    status: inquiryStatusEnum("status").notNull().default("new"),

    retentionExpiresAt: timestamp("retention_expires_at", { withTimezone: true }),
    anonymizedAt: timestamp("anonymized_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (table) => [
    index("inquiries_event_date_idx").on(table.eventDate),
    index("inquiries_status_idx").on(table.status),
    index("inquiries_email_lower_idx").on(sql`lower(${table.email})`),
    index("inquiries_created_at_idx").on(table.createdAt.desc()),
  ],
);

export type Inquiry = typeof inquiries.$inferSelect;
export type NewInquiry = typeof inquiries.$inferInsert;
export type InquiryStatus = (typeof inquiryStatusEnum.enumValues)[number];

export const adminRoleEnum = pgEnum("admin_role", ["owner", "admin"]);

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  supabaseUserId: uuid("supabase_user_id").notNull().unique(),
  role: adminRoleEnum("role").notNull().default("admin"),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => sql`now()`),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    actorType: text("actor_type").notNull(),
    actorId: text("actor_id"),
    actorDisplayName: text("actor_display_name"),

    bookingId: uuid("booking_id"),
    inquiryId: uuid("inquiry_id"),

    action: text("action").notNull(),
    metadataJson: jsonb("metadata_json"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_log_inquiry_id_idx").on(table.inquiryId), index("audit_log_created_at_idx").on(table.createdAt.desc())],
);

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;

export const bookingStatusEnum = pgEnum("booking_status", [
  "hold",
  "confirmed",
  "expired",
  "cancelled",
  "completed",
]);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inquiryId: uuid("inquiry_id").unique().references(() => inquiries.id),
    referenceCode: text("reference_code").notNull().unique(),

    primaryContactName: text("primary_contact_name").notNull(),
    partnerName: text("partner_name"),
    email: text("email").notNull(),
    phone: text("phone"),

    eventType: text("event_type").notNull().default("wedding"),
    eventDate: date("event_date").notNull(),
    eventTimezone: text("event_timezone").notNull().default("America/Los_Angeles"),

    venueName: text("venue_name"),
    venueAddressLine1: text("venue_address_line1"),
    venueAddressLine2: text("venue_address_line2"),
    venueCity: text("venue_city"),
    venueState: text("venue_state"),
    venuePostalCode: text("venue_postal_code"),

    internalNotes: text("internal_notes"),

    status: bookingStatusEnum("status").notNull(),

    currency: text("currency").notNull().default("usd"),

    subtotalCents: integer("subtotal_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    requiredRetainerCents: integer("required_retainer_cents").notNull(),

    customizationDueAt: timestamp("customization_due_at", { withTimezone: true }),
    customizationLockedAt: timestamp("customization_locked_at", { withTimezone: true }),

    balanceDueAt: timestamp("balance_due_at", { withTimezone: true }),

    galleryPublishedAt: timestamp("gallery_published_at", { withTimezone: true }),
    galleryExpiresAt: timestamp("gallery_expires_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    expiredAt: timestamp("expired_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (table) => [
    unique("bookings_id_event_date_unique").on(table.id, table.eventDate),

    index("bookings_event_date_idx").on(table.eventDate),
    index("bookings_status_idx").on(table.status),
    index("bookings_status_event_date_idx").on(table.status, table.eventDate),
    index("bookings_email_lower_idx").on(sql`lower(${table.email})`),
    index("bookings_created_at_idx").on(table.createdAt.desc()),

    check("bookings_reference_code_format", sql`${table.referenceCode} ~ '^MS-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{7}$'`),
    check("bookings_subtotal_cents_nonnegative", sql`${table.subtotalCents} >= 0`),
    check("bookings_total_cents_nonnegative", sql`${table.totalCents} >= 0`),
    check("bookings_required_retainer_cents_nonnegative", sql`${table.requiredRetainerCents} >= 0`),
    check("bookings_confirmed_requires_confirmed_at", sql`${table.status} <> 'confirmed' OR ${table.confirmedAt} IS NOT NULL`),
    check("bookings_expired_requires_expired_at", sql`${table.status} <> 'expired' OR ${table.expiredAt} IS NOT NULL`),
    check("bookings_cancelled_requires_cancelled_at", sql`${table.status} <> 'cancelled' OR ${table.cancelledAt} IS NOT NULL`),
    check(
      "bookings_completed_requires_fields",
      sql`${table.status} <> 'completed' OR (${table.confirmedAt} IS NOT NULL AND ${table.completedAt} IS NOT NULL AND ${table.galleryPublishedAt} IS NOT NULL)`,
    ),
    check(
      "bookings_gallery_expires_requires_published",
      sql`${table.galleryExpiresAt} IS NULL OR ${table.galleryPublishedAt} IS NOT NULL`,
    ),
    check(
      "bookings_gallery_expires_after_published",
      sql`${table.galleryExpiresAt} IS NULL OR ${table.galleryExpiresAt} > ${table.galleryPublishedAt}`,
    ),
    check(
      "bookings_hold_retainer_is_30_percent",
      sql`${table.status} <> 'hold' OR ${table.requiredRetainerCents} = round(${table.totalCents} * 0.30)`,
    ),
  ],
);

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];

export const lineItemTypeEnum = pgEnum("line_item_type", [
  "package",
  "addon",
  "adjustment",
  "discount",
  "travel",
  "other",
]);

export const bookingLineItems = pgTable(
  "booking_line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id),

    itemType: lineItemTypeEnum("item_type").notNull(),
    catalogKey: text("catalog_key"),

    description: text("description").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),

    sortOrder: integer("sort_order").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("booking_line_items_one_package_per_booking")
      .on(table.bookingId)
      .where(sql`${table.itemType} = 'package'`),

    check("booking_line_items_quantity_positive", sql`${table.quantity} > 0`),
    check("booking_line_items_sort_order_nonnegative", sql`${table.sortOrder} >= 0`),
    check("booking_line_items_description_nonempty", sql`trim(${table.description}) <> ''`),
    check("booking_line_items_line_total_matches", sql`${table.lineTotalCents} = ${table.quantity} * ${table.unitPriceCents}`),
    check(
      "booking_line_items_nonnegative_unless_discount",
      sql`${table.itemType} NOT IN ('package', 'addon', 'travel', 'other') OR ${table.unitPriceCents} >= 0`,
    ),
    check("booking_line_items_discount_nonpositive", sql`${table.itemType} <> 'discount' OR ${table.unitPriceCents} <= 0`),
  ],
);

export type BookingLineItem = typeof bookingLineItems.$inferSelect;
export type NewBookingLineItem = typeof bookingLineItems.$inferInsert;

export const reservationStatusEnum = pgEnum("reservation_status", ["hold", "confirmed"]);

export const dateReservations = pgTable(
  "date_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id").notNull().unique(),
    eventDate: date("event_date").notNull().unique(),

    status: reservationStatusEnum("status").notNull(),
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      columns: [table.bookingId, table.eventDate],
      foreignColumns: [bookings.id, bookings.eventDate],
      name: "date_reservations_booking_event_date_fk",
    }),

    check(
      "date_reservations_hold_requires_fields",
      sql`${table.status} <> 'hold' OR (${table.holdExpiresAt} IS NOT NULL AND ${table.confirmedAt} IS NULL)`,
    ),
    check(
      "date_reservations_confirmed_requires_fields",
      sql`${table.status} <> 'confirmed' OR (${table.holdExpiresAt} IS NULL AND ${table.confirmedAt} IS NOT NULL)`,
    ),
  ],
);

export type DateReservation = typeof dateReservations.$inferSelect;
export type NewDateReservation = typeof dateReservations.$inferInsert;

export const clientMagicLinks = pgTable(
  "client_magic_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id),

    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("client_magic_links_token_hash_idx").on(table.tokenHash),
    index("client_magic_links_booking_id_idx").on(table.bookingId),
    index("client_magic_links_expires_at_idx").on(table.expiresAt),

    check("client_magic_links_token_hash_format", sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`),
    check("client_magic_links_expires_after_created", sql`${table.expiresAt} > ${table.createdAt}`),
    check("client_magic_links_used_after_created", sql`${table.usedAt} IS NULL OR ${table.usedAt} >= ${table.createdAt}`),
    check("client_magic_links_revoked_after_created", sql`${table.revokedAt} IS NULL OR ${table.revokedAt} >= ${table.createdAt}`),
  ],
);

export type ClientMagicLink = typeof clientMagicLinks.$inferSelect;
export type NewClientMagicLink = typeof clientMagicLinks.$inferInsert;

export const clientSessions = pgTable(
  "client_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id),

    sessionHash: text("session_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("client_sessions_session_hash_idx").on(table.sessionHash),
    index("client_sessions_booking_id_idx").on(table.bookingId),
    index("client_sessions_expires_at_idx").on(table.expiresAt),

    check("client_sessions_session_hash_format", sql`${table.sessionHash} ~ '^[0-9a-f]{64}$'`),
    check("client_sessions_expires_after_created", sql`${table.expiresAt} > ${table.createdAt}`),
    check("client_sessions_last_seen_after_created", sql`${table.lastSeenAt} IS NULL OR ${table.lastSeenAt} >= ${table.createdAt}`),
    check("client_sessions_revoked_after_created", sql`${table.revokedAt} IS NULL OR ${table.revokedAt} >= ${table.createdAt}`),
  ],
);

export type ClientSession = typeof clientSessions.$inferSelect;
export type NewClientSession = typeof clientSessions.$inferInsert;

export const contractStatusEnum = pgEnum("contract_status", ["draft", "signed", "superseded"]);

export const contractTemplates = pgTable(
  "contract_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    version: text("version").notNull().unique(),
    name: text("name").notNull(),

    sourceFormat: text("source_format").notNull(),
    sourceContent: text("source_content").notNull(),

    isActive: boolean("is_active").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("contract_templates_one_active_template").on(table.isActive).where(sql`${table.isActive} = true`),
  ],
);

export type ContractTemplate = typeof contractTemplates.$inferSelect;
export type NewContractTemplate = typeof contractTemplates.$inferInsert;

export const contracts = pgTable(
  "contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id),
    templateId: uuid("template_id").references(() => contractTemplates.id),

    versionNumber: integer("version_number").notNull(),
    status: contractStatusEnum("status").notNull(),

    renderedContent: text("rendered_content").notNull(),
    contentHash: text("content_hash").notNull(),

    bookingTotalCents: integer("booking_total_cents").notNull(),
    currency: text("currency").notNull().default("usd"),

    signedName: text("signed_name"),
    signedEmail: text("signed_email"),
    accepted: boolean("accepted").notNull().default(false),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    signedIp: inet("signed_ip"),
    signedUserAgent: text("signed_user_agent"),

    supersededAt: timestamp("superseded_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("contracts_booking_id_version_number_unique").on(table.bookingId, table.versionNumber),
    uniqueIndex("contracts_one_current_per_booking").on(table.bookingId).where(sql`${table.status} <> 'superseded'`),
    index("contracts_booking_id_status_idx").on(table.bookingId, table.status),

    check("contracts_version_number_positive", sql`${table.versionNumber} > 0`),
    check("contracts_booking_total_cents_nonnegative", sql`${table.bookingTotalCents} >= 0`),
    check("contracts_content_hash_format", sql`${table.contentHash} ~ '^[0-9a-f]{64}$'`),
    check(
      "contracts_signed_requires_fields",
      sql`${table.status} <> 'signed' OR (${table.accepted} = true AND ${table.signedAt} IS NOT NULL AND ${table.signedName} IS NOT NULL AND ${table.signedEmail} IS NOT NULL)`,
    ),
    check("contracts_superseded_requires_superseded_at", sql`${table.status} <> 'superseded' OR ${table.supersededAt} IS NOT NULL`),
  ],
);

export type Contract = typeof contracts.$inferSelect;
export type NewContract = typeof contracts.$inferInsert;
