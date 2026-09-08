import { InquiryRepository } from "@/server/repositories/inquiry-repository";
import { AuditRepository } from "@/server/repositories/audit-repository";
import { EmailGateway } from "@/server/gateways/email-gateway";
import type { NewInquiry, Inquiry, InquiryStatus } from "@/lib/db/schema";

export async function submitInquiry(input: NewInquiry): Promise<Inquiry> {
  const inquiry = await InquiryRepository.create(input);

  try {
    await EmailGateway.sendInquiryReceived({
      to: inquiry.email,
      firstName: inquiry.firstName,
      eventDate: inquiry.eventDate,
    });
  } catch (error) {
    // Email failure must not corrupt the inquiry that was already saved.
    console.error("[submitInquiry] Failed to send inquiry-received email:", error);
  }

  return inquiry;
}

export async function listInquiries(filters?: { status?: InquiryStatus }): Promise<Inquiry[]> {
  return InquiryRepository.list(filters);
}

export async function getInquiry(id: string): Promise<Inquiry | null> {
  return InquiryRepository.findById(id);
}

const REVIEWABLE_STATUSES: readonly InquiryStatus[] = ["reviewing", "waitlisted", "declined"];

/**
 * Moves an inquiry between the admin-reviewable statuses. Converting to a booking
 * (status "converted") is out of scope here — that's Phase 4's approval/hold flow.
 */
export async function reviewInquiry(
  id: string,
  newStatus: InquiryStatus,
  actor: { id: string; displayName: string },
): Promise<Inquiry> {
  if (!REVIEWABLE_STATUSES.includes(newStatus)) {
    throw new Error(`"${newStatus}" is not a status this dashboard can set.`);
  }

  const existing = await InquiryRepository.findById(id);
  if (!existing) {
    throw new Error("Inquiry not found.");
  }
  if (existing.status === "converted") {
    throw new Error("This inquiry has already been converted to a booking and can no longer be changed here.");
  }

  const updated = await InquiryRepository.updateStatus(id, newStatus);
  if (!updated) {
    throw new Error("Inquiry not found.");
  }

  await AuditRepository.record({
    actorType: "admin",
    actorId: actor.id,
    actorDisplayName: actor.displayName,
    inquiryId: id,
    action: "inquiry.status_changed",
    metadataJson: { from: existing.status, to: newStatus },
  });

  return updated;
}
