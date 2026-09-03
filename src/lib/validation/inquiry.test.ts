import { describe, expect, it } from "vitest";
import { inquirySchema } from "./inquiry";

function futureDate(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

const validBase = {
  firstName: "Jamie",
  email: "jamie@example.com",
  eventDate: futureDate(90),
  eventType: "wedding" as const,
};

describe("inquirySchema", () => {
  it("accepts a minimal valid submission", () => {
    const result = inquirySchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("accepts a fully-specified valid submission", () => {
    const result = inquirySchema.safeParse({
      ...validBase,
      lastName: "Rivera",
      partnerFirstName: "Alex",
      partnerLastName: "Rivera",
      phone: "555-123-4567",
      eventType: "wedding",
      venueName: "The Grand Hall",
      venueCity: "Austin",
      venueState: "TX",
      estimatedGuestCount: 120,
      packageInterest: "Signature",
      message: "Excited to work with you!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing first name", () => {
    const result = inquirySchema.safeParse({ ...validBase, firstName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing email", () => {
    const result = inquirySchema.safeParse({
      firstName: validBase.firstName,
      eventDate: validBase.eventDate,
      eventType: validBase.eventType,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed email", () => {
    const result = inquirySchema.safeParse({ ...validBase, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects an event date in the past", () => {
    const result = inquirySchema.safeParse({ ...validBase, eventDate: futureDate(-30) });
    expect(result.success).toBe(false);
  });

  it("accepts today as the event date", () => {
    const result = inquirySchema.safeParse({ ...validBase, eventDate: futureDate(0) });
    expect(result.success).toBe(true);
  });

  it("rejects a package interest outside the known set", () => {
    const result = inquirySchema.safeParse({ ...validBase, packageInterest: "Deluxe" });
    expect(result.success).toBe(false);
  });

  it("rejects a filled-in honeypot field", () => {
    const result = inquirySchema.safeParse({ ...validBase, companyWebsite: "https://spam.example" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive guest count", () => {
    const result = inquirySchema.safeParse({ ...validBase, estimatedGuestCount: -5 });
    expect(result.success).toBe(false);
  });
});
