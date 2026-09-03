import { z } from "zod";

import { PACKAGES } from "@/config/pricing";

const PACKAGE_INTEREST_OPTIONS = [...PACKAGES.map((pkg) => pkg.name), "Not sure yet"] as const;

const EVENT_TYPE_OPTIONS = ["wedding", "engagement", "other"] as const;

function isTodayOrLater(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${value}T00:00:00`);
  return date >= today;
}

export const inquirySchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().optional().or(z.literal("")),
  partnerFirstName: z.string().trim().optional().or(z.literal("")),
  partnerLastName: z.string().trim().optional().or(z.literal("")),

  email: z.email("Enter a valid email address"),
  phone: z.string().trim().optional().or(z.literal("")),

  eventType: z.enum(EVENT_TYPE_OPTIONS),
  eventDate: z
    .string()
    .min(1, "Event date is required")
    .refine(isTodayOrLater, "Event date can't be in the past"),
  venueName: z.string().trim().optional().or(z.literal("")),
  venueCity: z.string().trim().optional().or(z.literal("")),
  venueState: z.string().trim().optional().or(z.literal("")),
  estimatedGuestCount: z.coerce.number().int().positive().optional().or(z.literal("")),

  packageInterest: z.enum(PACKAGE_INTEREST_OPTIONS).optional().or(z.literal("")),
  message: z.string().trim().max(2000, "Keep it under 2000 characters").optional().or(z.literal("")),
  leadSource: z.string().trim().optional().or(z.literal("")),

  // Honeypot: real visitors never fill this in. Kept optional/empty on purpose.
  companyWebsite: z.string().max(0, "").optional().or(z.literal("")),
  // Set client-side to the page-load timestamp; the server rejects submissions that arrive too fast to be human.
  formRenderedAt: z.coerce.number().optional(),
});

export type InquiryFormInput = z.input<typeof inquirySchema>;
export type InquiryFormOutput = z.output<typeof inquirySchema>;

export { PACKAGE_INTEREST_OPTIONS, EVENT_TYPE_OPTIONS };
