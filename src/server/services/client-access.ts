import { BookingRepository } from "@/server/repositories/booking-repository";
import { ClientMagicLinkRepository } from "@/server/repositories/client-magic-link-repository";
import { ClientSessionRepository } from "@/server/repositories/client-session-repository";
import { EmailGateway } from "@/server/gateways/email-gateway";
import { generateToken, hashToken } from "@/lib/client-token";
import { serverEnv } from "@/lib/env";
import type { Booking } from "@/lib/db/schema";

const MAGIC_LINK_DURATION_HOURS = 24; // not specified in the docs like the 72h hold/30d session — a reasonable, configurable default
const SESSION_DURATION_DAYS = 30; // ARCHITECTURE.md §10's recommended launch value

export class InvalidMagicLinkError extends Error {
  constructor() {
    super("This link is invalid or has expired.");
    this.name = "InvalidMagicLinkError";
  }
}

/** Generates and emails a fresh magic link for a booking. Used both by the approval flow (first link) and requestClientAccess (renewal). */
export async function sendAccessLink(booking: Booking): Promise<void> {
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_DURATION_HOURS * 60 * 60 * 1000);

  await ClientMagicLinkRepository.create({ bookingId: booking.id, tokenHash, expiresAt });

  const base = (serverEnv.APP_URL ?? "").replace(/\/$/, "");
  await EmailGateway.sendMagicLink({
    to: booking.email,
    bookingReference: booking.referenceCode,
    url: `${base}/access/${rawToken}`,
  });
}

/**
 * BR-ACC-007: always resolves the same way regardless of whether a matching booking was
 * found — the caller must show one fixed message either way, never branch on this.
 */
export async function requestClientAccess(email: string): Promise<void> {
  const booking = await BookingRepository.findActiveByEmail(email);
  if (!booking) return;

  try {
    await sendAccessLink(booking);
  } catch (error) {
    console.error("[requestClientAccess] Failed to send access link:", error);
  }
}

export async function redeemMagicLink(rawToken: string): Promise<{ rawSessionToken: string; bookingId: string }> {
  const tokenHash = hashToken(rawToken);
  const link = await ClientMagicLinkRepository.redeemIfValid(tokenHash);
  if (!link) {
    throw new InvalidMagicLinkError();
  }

  const rawSessionToken = generateToken();
  const sessionHash = hashToken(rawSessionToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
  await ClientSessionRepository.create({ bookingId: link.bookingId, sessionHash, expiresAt });

  return { rawSessionToken, bookingId: link.bookingId };
}

export async function getClientSession(rawSessionToken: string): Promise<{ booking: Booking } | null> {
  const sessionHash = hashToken(rawSessionToken);
  const session = await ClientSessionRepository.findValidByHash(sessionHash);
  if (!session) return null;

  await ClientSessionRepository.touch(session.id);

  const booking = await BookingRepository.findById(session.bookingId);
  if (!booking) return null;

  return { booking };
}
