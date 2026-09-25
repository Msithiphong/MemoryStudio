import { z } from "zod";

/** Metadata we attach to every Checkout Session. Validated before it's trusted as an internal identifier (CLAUDE.md #15). */
export const checkoutSessionMetadataSchema = z.object({
  paymentId: z.uuid(),
  bookingId: z.uuid(),
  paymentType: z.enum(["deposit", "balance"]),
});

export type CheckoutSessionMetadataInput = z.infer<typeof checkoutSessionMetadataSchema>;

export const setBalanceDueDateSchema = z.object({
  // An <input type="date"> value ("YYYY-MM-DD"), treated as end-of-day for that date.
  dueDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
    .or(z.literal("")),
});
