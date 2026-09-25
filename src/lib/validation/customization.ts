import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : null));

const MAX_PROMPT_TEXT_LENGTH = 300;
// Safety cap on array size only — the real, per-booking limit is enforced in the service
// against the stored `maxPrompts` value, never a value the client could influence.
const MAX_PROMPTS_ARRAY_LENGTH = 50;

export const customizationFormSchema = z
  .object({
    displayName1: optionalText(120),
    displayName2: optionalText(120),
    welcomeMessage: optionalText(2000),
    signageText: optionalText(500),
    clientNotes: optionalText(2000),
    prompts: z.array(z.string().trim().max(MAX_PROMPT_TEXT_LENGTH)).max(MAX_PROMPTS_ARRAY_LENGTH),
    submit: z.boolean(),
  })
  // Drafts may be saved with blank/no prompts; submitting requires at least one.
  .refine((data) => !data.submit || data.prompts.some((p) => p.trim().length > 0), {
    message: "Add at least one recording prompt before submitting.",
    path: ["prompts"],
  });

export type CustomizationFormInput = z.input<typeof customizationFormSchema>;
export type CustomizationFormOutput = z.output<typeof customizationFormSchema>;

export const setMaxPromptsSchema = z.object({
  maxPrompts: z.coerce.number().int().min(1).max(MAX_PROMPTS_ARRAY_LENGTH),
});

export const setCustomizationDueDateSchema = z.object({
  // An <input type="date"> value ("YYYY-MM-DD"), treated as end-of-day for that date.
  dueDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
    .or(z.literal("")),
});
