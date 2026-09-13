import { z } from "zod";

export const signContractSchema = z.object({
  signedName: z.string().trim().min(2, "Enter your full legal name"),
  accepted: z.boolean().refine((v) => v === true, "You must confirm you agree to the contract terms"),
});

export type SignContractInput = z.infer<typeof signContractSchema>;
