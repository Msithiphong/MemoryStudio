import { getDb } from "@/lib/db";
import { ContractRepository } from "@/server/repositories/contract-repository";
import { ContractTemplateRepository } from "@/server/repositories/contract-template-repository";
import { BookingRepository } from "@/server/repositories/booking-repository";
import { BookingLineItemRepository } from "@/server/repositories/booking-line-item-repository";
import { AuditRepository } from "@/server/repositories/audit-repository";
import { EmailGateway } from "@/server/gateways/email-gateway";
import { renderContractTemplate } from "@/lib/contract-render";
import { hashContractContent } from "@/lib/contract-hash";
import { formatMoney } from "@/lib/money";
import { isUniqueViolation } from "@/server/services/db-errors";
import type { Booking, BookingLineItem, Contract } from "@/lib/db/schema";

export class NoActiveContractTemplateError extends Error {
  constructor() {
    super("No active contract template is configured.");
    this.name = "NoActiveContractTemplateError";
  }
}

export class ContractNotFoundError extends Error {
  constructor() {
    super("No contract exists for this booking yet.");
    this.name = "ContractNotFoundError";
  }
}

export class ContractAlreadySignedError extends Error {
  constructor() {
    super("This contract has already been signed.");
    this.name = "ContractAlreadySignedError";
  }
}

function buildContractFields(booking: Booking, lineItems: BookingLineItem[]): Record<string, string> {
  const packageItem = lineItems.find((item) => item.itemType === "package");
  return {
    clientName: [booking.primaryContactName, booking.partnerName].filter(Boolean).join(" & "),
    eventDate: new Date(`${booking.eventDate}T00:00:00`).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    packageName: packageItem?.description ?? "Selected package",
    totalAmount: formatMoney(booking.totalCents),
    retainerAmount: formatMoney(booking.requiredRetainerCents),
    referenceCode: booking.referenceCode,
  };
}

/**
 * Idempotent, concurrency-safe "load or lazily create" — the first admin or client page
 * view of a booking's contract creates its draft snapshot. There's no pre-existing row to
 * lock, so this relies on the `contracts_one_current_per_booking` partial unique index as
 * the single source of truth: a concurrent second caller simply loses its own INSERT and
 * re-reads what the winner created.
 */
export async function getOrCreateCurrentContract(bookingId: string): Promise<Contract> {
  const existing = await ContractRepository.findCurrentByBookingId(bookingId);
  if (existing) return existing;

  const booking = await BookingRepository.findById(bookingId);
  if (!booking) throw new Error("Booking not found.");

  const template = await ContractTemplateRepository.findActive();
  if (!template) throw new NoActiveContractTemplateError();

  const lineItems = await BookingLineItemRepository.listForBooking(bookingId);
  const renderedContent = renderContractTemplate(template.sourceContent, buildContractFields(booking, lineItems));
  const contentHash = hashContractContent(renderedContent);

  try {
    return await ContractRepository.create({
      bookingId,
      templateId: template.id,
      versionNumber: 1,
      status: "draft",
      renderedContent,
      contentHash,
      bookingTotalCents: booking.totalCents,
      currency: booking.currency,
    });
  } catch (error) {
    // A concurrent caller can win either unique constraint first — both indicate the
    // same thing here (someone else already created this booking's first contract) —
    // so either one means "go re-read what they created" rather than a real failure.
    if (
      isUniqueViolation(error, "contracts_one_current_per_booking") ||
      isUniqueViolation(error, "contracts_booking_id_version_number_unique")
    ) {
      const current = await ContractRepository.findCurrentByBookingId(bookingId);
      if (current) return current;
    }
    throw error;
  }
}

export async function signContract(
  bookingId: string,
  input: { signedName: string; signedEmail: string; ip: string | null; userAgent: string | null },
): Promise<Contract> {
  const current = await ContractRepository.findCurrentByBookingId(bookingId);
  if (!current) throw new ContractNotFoundError();

  const signed = await ContractRepository.signIfDraft(current.id, {
    signedName: input.signedName,
    signedEmail: input.signedEmail,
    signedIp: input.ip,
    signedUserAgent: input.userAgent,
  });
  if (!signed) throw new ContractAlreadySignedError();

  await AuditRepository.record({
    actorType: "client",
    actorId: bookingId,
    actorDisplayName: signed.signedName,
    bookingId,
    action: "contract.signed",
    metadataJson: { contractId: signed.id, versionNumber: signed.versionNumber, contentHash: signed.contentHash },
  });

  try {
    const booking = await BookingRepository.findById(bookingId);
    if (booking) {
      await EmailGateway.sendContractSigned({
        to: signed.signedEmail!,
        firstName: input.signedName.split(" ")[0] ?? input.signedName,
        referenceCode: booking.referenceCode,
        versionNumber: signed.versionNumber,
        signedAt: signed.signedAt!,
      });
    }
  } catch (error) {
    console.error("[signContract] Failed to send contract-signed email:", error);
  }

  return signed;
}

/**
 * Not wired to any UI yet (no line-item-editing flow exists in the app), but required by
 * BR-CON-005/006 and PLAN.md's "add superseding workflow" task — a future phase that lets
 * admins edit approved line items will call this when a material change occurs post-signature.
 */
export async function supersedeAndCreateNewVersion(
  bookingId: string,
  actor: { type: "admin" | "system"; id: string; displayName: string },
): Promise<Contract> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const current = await ContractRepository.findCurrentByBookingId(bookingId, tx);
    if (!current) throw new ContractNotFoundError();

    const superseded = await ContractRepository.supersedeIfCurrent(current.id, tx);
    if (!superseded) throw new ContractAlreadySignedError();

    const booking = await BookingRepository.findById(bookingId, tx);
    if (!booking) throw new Error("Booking not found.");

    const template = current.templateId
      ? await ContractTemplateRepository.findById(current.templateId, tx)
      : await ContractTemplateRepository.findActive(tx);
    if (!template) throw new NoActiveContractTemplateError();

    const lineItems = await BookingLineItemRepository.listForBooking(bookingId, tx);
    const renderedContent = renderContractTemplate(template.sourceContent, buildContractFields(booking, lineItems));
    const contentHash = hashContractContent(renderedContent);

    const next = await ContractRepository.create(
      {
        bookingId,
        templateId: template.id,
        versionNumber: current.versionNumber + 1,
        status: "draft",
        renderedContent,
        contentHash,
        bookingTotalCents: booking.totalCents,
        currency: booking.currency,
      },
      tx,
    );

    await AuditRepository.record(
      {
        actorType: actor.type,
        actorId: actor.id,
        actorDisplayName: actor.displayName,
        bookingId,
        action: "contract.superseded",
        metadataJson: { previousContractId: current.id, newContractId: next.id, newVersionNumber: next.versionNumber },
      },
      tx,
    );

    return next;
  });
}
