import { z } from "zod";

export const lineItemInputSchema = z.object({
  itemType: z.enum(["package", "addon", "adjustment", "discount", "travel", "other"]),
  catalogKey: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.coerce.number().int().positive(),
  unitPriceCents: z.coerce.number().int(),
});

export const approveInquirySchema = z.object({
  lineItems: z
    .array(lineItemInputSchema)
    .min(1, "Add at least a package line item")
    .refine((items) => items.filter((i) => i.itemType === "package").length === 1, {
      message: "Choose exactly one package",
    }),
});

export type LineItemInput = z.infer<typeof lineItemInputSchema>;
export type ApproveInquiryInput = z.infer<typeof approveInquirySchema>;
