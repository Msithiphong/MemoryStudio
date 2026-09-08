import { sql } from "drizzle-orm";
import { boolean, date, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
