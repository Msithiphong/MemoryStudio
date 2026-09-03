import { sql } from "drizzle-orm";
import { date, index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
