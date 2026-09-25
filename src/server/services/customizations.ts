import { defaultPromptLimitForPackageCatalogKey } from "@/config/customization";
import { AuditRepository } from "@/server/repositories/audit-repository";
import { BookingCustomizationRepository } from "@/server/repositories/booking-customization-repository";
import { BookingLineItemRepository } from "@/server/repositories/booking-line-item-repository";
import { BookingPromptRepository } from "@/server/repositories/booking-prompt-repository";
import { BookingRepository } from "@/server/repositories/booking-repository";
import { EmailGateway } from "@/server/gateways/email-gateway";
import { isUniqueViolation } from "@/server/services/db-errors";
import type { Booking, BookingCustomization, BookingPrompt } from "@/lib/db/schema";
import type { CustomizationFormOutput } from "@/lib/validation/customization";

export class BookingNotFoundError extends Error {
  constructor() {
    super("Booking not found.");
    this.name = "BookingNotFoundError";
  }
}

export class CustomizationLockedError extends Error {
  constructor() {
    super("Customization is locked for this booking. Contact Memory Studio if you need to make a change.");
    this.name = "CustomizationLockedError";
  }
}

export class TooManyPromptsError extends Error {
  constructor(readonly maxPrompts: number) {
    super(`This package allows up to ${maxPrompts} recording prompts.`);
    this.name = "TooManyPromptsError";
  }
}

export class PromptRequiredError extends Error {
  constructor() {
    super("Add at least one recording prompt before submitting.");
    this.name = "PromptRequiredError";
  }
}

export type CustomizationView = {
  customization: BookingCustomization;
  prompts: BookingPrompt[];
  locked: boolean;
  /** True only when the booking has a custom-signage add-on line item — signage wording is otherwise not collected (DATABASE.md 3.12: "if applicable"). */
  signageApplicable: boolean;
};

/**
 * Idempotent, concurrency-safe "load or lazily create" — mirrors getOrCreateCurrentContract.
 * The first view of a booking's customization (client or admin) creates its row, seeded
 * with the package's default prompt limit; a concurrent second caller loses its own INSERT
 * on the `booking_customizations_booking_id_unique` constraint and re-reads the winner's row.
 */
export async function getOrCreateCustomizationView(bookingId: string): Promise<CustomizationView> {
  const booking = await BookingRepository.findById(bookingId);
  if (!booking) throw new BookingNotFoundError();

  const lineItems = await BookingLineItemRepository.listForBooking(bookingId);
  const signageApplicable = lineItems.some((item) => item.catalogKey === "addon.custom_signage");

  let customization = await BookingCustomizationRepository.findByBookingId(bookingId);
  if (!customization) {
    const packageItem = lineItems.find((item) => item.itemType === "package");
    const maxPrompts = defaultPromptLimitForPackageCatalogKey(packageItem?.catalogKey);

    try {
      customization = await BookingCustomizationRepository.create({ bookingId, maxPrompts });
    } catch (error) {
      if (isUniqueViolation(error, "booking_customizations_booking_id_unique")) {
        customization = await BookingCustomizationRepository.findByBookingId(bookingId);
      }
      if (!customization) throw error;
    }
  }

  const prompts = await BookingPromptRepository.listForBooking(bookingId);

  return { customization, prompts, locked: booking.customizationLockedAt !== null, signageApplicable };
}

export async function updateCustomization(bookingId: string, input: CustomizationFormOutput): Promise<CustomizationView> {
  const booking = await BookingRepository.findById(bookingId);
  if (!booking) throw new BookingNotFoundError();
  if (booking.customizationLockedAt !== null) throw new CustomizationLockedError();

  const { customization: current } = await getOrCreateCustomizationView(bookingId);

  const promptTexts = input.prompts.map((p) => p.trim()).filter((p) => p.length > 0);
  if (promptTexts.length > current.maxPrompts) {
    throw new TooManyPromptsError(current.maxPrompts);
  }
  // Re-checked here (not just in the form's Zod schema) so this rule holds for every
  // caller of this service, not only the client form's action.
  if (input.submit && promptTexts.length === 0) {
    throw new PromptRequiredError();
  }

  await BookingCustomizationRepository.update(bookingId, {
    displayName1: input.displayName1,
    displayName2: input.displayName2,
    welcomeMessage: input.welcomeMessage,
    signageText: input.signageText,
    clientNotes: input.clientNotes,
    ...(input.submit ? { submittedAt: new Date() } : {}),
  });
  await BookingPromptRepository.replaceForBooking(bookingId, promptTexts);

  await AuditRepository.record({
    actorType: "client",
    actorId: bookingId,
    bookingId,
    action: input.submit ? "customization.submitted" : "customization.draft_saved",
    metadataJson: { promptCount: promptTexts.length },
  });

  return getOrCreateCustomizationView(bookingId);
}

export async function lockCustomization(bookingId: string, actor: { id: string; displayName: string }): Promise<Booking> {
  const booking = await BookingRepository.lockCustomization(bookingId);
  if (!booking) {
    const existing = await BookingRepository.findById(bookingId);
    if (!existing) throw new BookingNotFoundError();
    return existing; // already locked — treat as a no-op success, not an error
  }

  await AuditRepository.record({
    actorType: "admin",
    actorId: actor.id,
    actorDisplayName: actor.displayName,
    bookingId,
    action: "customization.locked",
  });
  return booking;
}

export async function unlockCustomization(bookingId: string, actor: { id: string; displayName: string }): Promise<Booking> {
  const booking = await BookingRepository.unlockCustomization(bookingId);
  if (!booking) {
    const existing = await BookingRepository.findById(bookingId);
    if (!existing) throw new BookingNotFoundError();
    return existing; // already unlocked — treat as a no-op success, not an error
  }

  await AuditRepository.record({
    actorType: "admin",
    actorId: actor.id,
    actorDisplayName: actor.displayName,
    bookingId,
    action: "customization.unlocked",
  });
  return booking;
}

export async function setCustomizationDueDate(
  bookingId: string,
  dueAt: Date | null,
  actor: { id: string; displayName: string },
): Promise<Booking> {
  const booking = await BookingRepository.setCustomizationDueAt(bookingId, dueAt);
  if (!booking) throw new BookingNotFoundError();

  await AuditRepository.record({
    actorType: "admin",
    actorId: actor.id,
    actorDisplayName: actor.displayName,
    bookingId,
    action: "customization.due_date_set",
    metadataJson: { dueAt: dueAt?.toISOString() ?? null },
  });
  return booking;
}

export async function setMaxPrompts(
  bookingId: string,
  maxPrompts: number,
  actor: { id: string; displayName: string },
): Promise<BookingCustomization> {
  await getOrCreateCustomizationView(bookingId); // ensures the row exists before we try to update it

  const updated = await BookingCustomizationRepository.setMaxPrompts(bookingId, maxPrompts);
  if (!updated) throw new BookingNotFoundError();

  await AuditRepository.record({
    actorType: "admin",
    actorId: actor.id,
    actorDisplayName: actor.displayName,
    bookingId,
    action: "customization.max_prompts_set",
    metadataJson: { maxPrompts },
  });
  return updated;
}

export async function sendCustomizationReminder(bookingId: string, actor: { id: string; displayName: string }): Promise<void> {
  const booking = await BookingRepository.findById(bookingId);
  if (!booking) throw new BookingNotFoundError();

  await EmailGateway.sendCustomizationReminder({
    to: booking.email,
    firstName: booking.primaryContactName.split(" ")[0] ?? booking.primaryContactName,
    referenceCode: booking.referenceCode,
    dueAt: booking.customizationDueAt,
  });

  await AuditRepository.record({
    actorType: "admin",
    actorId: actor.id,
    actorDisplayName: actor.displayName,
    bookingId,
    action: "customization.reminder_sent",
  });
}
