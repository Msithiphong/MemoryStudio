import { z } from "zod";

export const requestAccessSchema = z.object({
  email: z.email("Enter a valid email address"),
  // Honeypot — real visitors never fill this in.
  companyWebsite: z.string().max(0, "").optional().or(z.literal("")),
  // Page-load timestamp; the server rejects submissions that arrive too fast to be human.
  formRenderedAt: z.coerce.number().optional(),
});

export type RequestAccessInput = z.input<typeof requestAccessSchema>;
export type RequestAccessOutput = z.output<typeof requestAccessSchema>;
