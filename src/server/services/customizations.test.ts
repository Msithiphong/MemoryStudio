import { describe, expect, it, afterEach, vi } from "vitest";
import { inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { auditLog, bookingCustomizations, bookingLineItems, bookingPrompts, bookings } from "@/lib/db/schema";
import { BookingRepository } from "@/server/repositories/booking-repository";
import { BookingLineItemRepository } from "@/server/repositories/booking-line-item-repository";
import { generateReferenceCode } from "@/lib/booking-reference";
import {
  BookingNotFoundError,
  CustomizationLockedError,
  PromptRequiredError,
  TooManyPromptsError,
  getOrCreateCustomizationView,
  lockCustomization,
  sendCustomizationReminder,
  setCustomizationDueDate,
  setMaxPrompts,
  unlockCustomization,
  updateCustomization,
} from "./customizations";
import type { Booking } from "@/lib/db/schema";

vi.mock("@/server/gateways/email-gateway", () => ({
  EmailGateway: { sendCustomizationReminder: vi.fn().mockResolvedValue(undefined) },
}));
import { EmailGateway } from "@/server/gateways/email-gateway";

const hasDb = !!process.env.DATABASE_URL;
const testActor = { id: "test-admin-id", displayName: "Test Admin" };

let dateCounter = 0;
function uniqueFutureDate() {
  const date = new Date();
  date.setDate(date.getDate() + 3_000 + Math.floor(Math.random() * 5_000) + dateCounter++);
  return date.toISOString().slice(0, 10);
}

describe.skipIf(!hasDb)("customizations service", () => {
  const createdBookingIds: string[] = [];

  afterEach(async () => {
    vi.clearAllMocks();
    const db = getDb();
    if (createdBookingIds.length > 0) {
      await db.delete(bookingPrompts).where(inArray(bookingPrompts.bookingId, createdBookingIds));
      await db.delete(bookingCustomizations).where(inArray(bookingCustomizations.bookingId, createdBookingIds));
      await db.delete(bookingLineItems).where(inArray(bookingLineItems.bookingId, createdBookingIds));
      await db.delete(auditLog).where(inArray(auditLog.bookingId, createdBookingIds));
      await db.delete(bookings).where(inArray(bookings.id, createdBookingIds));
      createdBookingIds.length = 0;
    }
  });

  async function createBooking(options: { packageCatalogKey?: string; withSignage?: boolean } = {}): Promise<Booking> {
    const { packageCatalogKey = "package.moment", withSignage = false } = options;
    const booking = await BookingRepository.create({
      referenceCode: generateReferenceCode(),
      primaryContactName: "__E2E_TEST__ Customizer",
      email: "__e2e_customizations__@example.com",
      eventType: "wedding",
      eventDate: uniqueFutureDate(),
      status: "confirmed",
      confirmedAt: new Date(),
      subtotalCents: 49_900,
      totalCents: 49_900,
      requiredRetainerCents: 14_970,
    });
    createdBookingIds.push(booking.id);

    await BookingLineItemRepository.createMany([
      {
        bookingId: booking.id,
        itemType: "package",
        catalogKey: packageCatalogKey,
        description: "Test Package",
        quantity: 1,
        unitPriceCents: 49_900,
        lineTotalCents: 49_900,
        sortOrder: 0,
      },
      ...(withSignage
        ? [
            {
              bookingId: booking.id,
              itemType: "addon" as const,
              catalogKey: "addon.custom_signage",
              description: "Custom signage",
              quantity: 1,
              unitPriceCents: 7_500,
              lineTotalCents: 7_500,
              sortOrder: 1,
            },
          ]
        : []),
    ]);

    return booking;
  }

  function formInput(overrides: Partial<Parameters<typeof updateCustomization>[1]> = {}) {
    return {
      displayName1: "Alex",
      displayName2: "Sam",
      welcomeMessage: "Welcome!",
      signageText: "",
      clientNotes: "",
      prompts: ["What's your favorite memory of us?"],
      submit: false,
      ...overrides,
    };
  }

  describe("getOrCreateCustomizationView", () => {
    it("seeds the prompt limit from the approved package (BR-CUS-003)", async () => {
      const moment = await createBooking({ packageCatalogKey: "package.moment" });
      const signature = await createBooking({ packageCatalogKey: "package.signature" });

      expect((await getOrCreateCustomizationView(moment.id)).customization.maxPrompts).toBe(3);
      expect((await getOrCreateCustomizationView(signature.id)).customization.maxPrompts).toBe(5);
    });

    it("is idempotent — a second call returns the same row", async () => {
      const booking = await createBooking();
      const first = await getOrCreateCustomizationView(booking.id);
      const second = await getOrCreateCustomizationView(booking.id);
      expect(second.customization.id).toBe(first.customization.id);
    });

    it("only surfaces signage wording when a custom-signage line item exists", async () => {
      const withoutSignage = await createBooking({ withSignage: false });
      const withSignage = await createBooking({ withSignage: true });

      expect((await getOrCreateCustomizationView(withoutSignage.id)).signageApplicable).toBe(false);
      expect((await getOrCreateCustomizationView(withSignage.id)).signageApplicable).toBe(true);
    });

    it("creates no color fields — none exist on the row", async () => {
      const booking = await createBooking();
      const { customization } = await getOrCreateCustomizationView(booking.id);
      expect(Object.keys(customization)).not.toContain("color");
      expect(Object.keys(customization).some((k) => k.toLowerCase().includes("color"))).toBe(false);
    });

    it("handles concurrent first views without a duplicate-row error", async () => {
      const booking = await createBooking();
      const [a, b] = await Promise.all([getOrCreateCustomizationView(booking.id), getOrCreateCustomizationView(booking.id)]);
      expect(a.customization.id).toBe(b.customization.id);
    });
  });

  describe("updateCustomization", () => {
    it("saves a draft without requiring a prompt", async () => {
      const booking = await createBooking();
      const result = await updateCustomization(booking.id, formInput({ prompts: [], submit: false }));
      expect(result.customization.submittedAt).toBeNull();
      expect(result.prompts).toHaveLength(0);
    });

    it("requires at least one non-empty prompt to submit", async () => {
      const booking = await createBooking();
      await expect(updateCustomization(booking.id, formInput({ prompts: ["   "], submit: true }))).rejects.toBeInstanceOf(
        PromptRequiredError,
      );
    });

    it("records the submission timestamp and stores prompts in order", async () => {
      const booking = await createBooking({ packageCatalogKey: "package.signature" });
      const result = await updateCustomization(
        booking.id,
        formInput({ prompts: ["First question", "Second question"], submit: true }),
      );

      expect(result.customization.submittedAt).not.toBeNull();
      expect(result.prompts.map((p) => p.promptText)).toEqual(["First question", "Second question"]);
      expect(result.prompts.map((p) => p.sortOrder)).toEqual([0, 1]);
    });

    it("rejects more prompts than the package/admin limit allows", async () => {
      const booking = await createBooking({ packageCatalogKey: "package.moment" }); // limit 3
      await expect(
        updateCustomization(booking.id, formInput({ prompts: ["a", "b", "c", "d"], submit: false })),
      ).rejects.toBeInstanceOf(TooManyPromptsError);
    });

    it("cannot update after lock", async () => {
      const booking = await createBooking();
      await lockCustomization(booking.id, testActor);
      await expect(updateCustomization(booking.id, formInput())).rejects.toBeInstanceOf(CustomizationLockedError);
    });

    it("can update again after an admin reopens it", async () => {
      const booking = await createBooking();
      await lockCustomization(booking.id, testActor);
      await unlockCustomization(booking.id, testActor);
      const result = await updateCustomization(booking.id, formInput({ displayName1: "Changed" }));
      expect(result.customization.displayName1).toBe("Changed");
    });

    it("drops blank prompt slots from the dynamic form list", async () => {
      const booking = await createBooking({ packageCatalogKey: "package.signature" });
      const result = await updateCustomization(booking.id, formInput({ prompts: ["Real one", "   ", ""], submit: false }));
      expect(result.prompts.map((p) => p.promptText)).toEqual(["Real one"]);
    });

    it("throws for a booking that does not exist", async () => {
      await expect(updateCustomization("00000000-0000-0000-0000-000000000000", formInput())).rejects.toBeInstanceOf(
        BookingNotFoundError,
      );
    });
  });

  describe("lock / unlock", () => {
    it("locking is idempotent", async () => {
      const booking = await createBooking();
      await lockCustomization(booking.id, testActor);
      await lockCustomization(booking.id, testActor); // no-op, not an error
      const { locked } = await getOrCreateCustomizationView(booking.id);
      expect(locked).toBe(true);
    });

    it("unlocking is idempotent", async () => {
      const booking = await createBooking();
      await unlockCustomization(booking.id, testActor); // already unlocked — no-op
      const { locked } = await getOrCreateCustomizationView(booking.id);
      expect(locked).toBe(false);
    });
  });

  describe("setMaxPrompts", () => {
    it("raises the limit an admin sets, adjustably per BR-CUS-003", async () => {
      const booking = await createBooking({ packageCatalogKey: "package.moment" });
      await getOrCreateCustomizationView(booking.id); // seed the default of 3
      await setMaxPrompts(booking.id, 8, testActor);

      await expect(
        updateCustomization(booking.id, formInput({ prompts: Array.from({ length: 8 }, (_, i) => `Prompt ${i}`), submit: false })),
      ).resolves.toBeTruthy();
    });
  });

  describe("setCustomizationDueDate", () => {
    it("stores and clears the due date", async () => {
      const booking = await createBooking();
      const due = new Date("2031-05-01T23:59:59Z");
      const updated = await setCustomizationDueDate(booking.id, due, testActor);
      expect(updated.customizationDueAt?.toISOString()).toBe(due.toISOString());

      const cleared = await setCustomizationDueDate(booking.id, null, testActor);
      expect(cleared.customizationDueAt).toBeNull();
    });
  });

  describe("sendCustomizationReminder", () => {
    it("sends the reminder email with the booking's due date", async () => {
      const booking = await createBooking();
      const due = new Date("2031-05-01T23:59:59Z");
      await setCustomizationDueDate(booking.id, due, testActor);

      await sendCustomizationReminder(booking.id, testActor);

      expect(EmailGateway.sendCustomizationReminder).toHaveBeenCalledTimes(1);
      expect(EmailGateway.sendCustomizationReminder).toHaveBeenCalledWith(
        expect.objectContaining({ to: booking.email, referenceCode: booking.referenceCode, dueAt: due }),
      );
    });
  });
});
