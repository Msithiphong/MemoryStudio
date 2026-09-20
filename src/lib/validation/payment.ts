import { z } from "zod";

/** Metadata we attach to every Checkout Session. Validated before it's trusted as an internal identifier (CLAUDE.md #15). */
export const checkoutSessionMetadataSchema = z.object({
  paymentId: z.uuid(),
  bookingId: z.uuid(),
  paymentType: z.literal("deposit"),
});

export type CheckoutSessionMetadataInput = z.infer<typeof checkoutSessionMetadataSchema>;
