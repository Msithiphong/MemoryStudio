import { Resend } from "resend";

import { serverEnv } from "@/lib/env";
import { InquiryReceivedEmail } from "@/lib/email/inquiry-received";
import { BookingHoldEmail } from "@/lib/email/booking-hold";
import { MagicLinkEmail } from "@/lib/email/magic-link";
import { ContractSignedEmail } from "@/lib/email/contract-signed";

function getResendClient(): Resend | null {
  if (!serverEnv.RESEND_API_KEY || !serverEnv.EMAIL_FROM) {
    console.warn("[EmailGateway] RESEND_API_KEY or EMAIL_FROM is not configured — skipping email.");
    return null;
  }
  if (!serverEnv.APP_URL) {
    console.warn("[EmailGateway] APP_URL is not configured — email images won't render.");
  }
  return new Resend(serverEnv.RESEND_API_KEY);
}

export const EmailGateway = {
  async sendInquiryReceived(params: { to: string; firstName: string; eventDate: string }): Promise<void> {
    const resend = getResendClient();
    if (!resend) return;

    await resend.emails.send({
      from: `Memory Studio OC <${serverEnv.EMAIL_FROM}>`,
      to: params.to,
      subject: "We received your Memory Studio inquiry",
      react: InquiryReceivedEmail({
        firstName: params.firstName,
        eventDate: params.eventDate,
        assetsBaseUrl: serverEnv.APP_URL ?? "",
      }),
    });
  },

  async sendBookingHold(params: { to: string; firstName: string; eventDate: string; referenceCode: string }): Promise<void> {
    const resend = getResendClient();
    if (!resend) return;

    await resend.emails.send({
      from: `Memory Studio OC <${serverEnv.EMAIL_FROM}>`,
      to: params.to,
      subject: "Your Memory Studio date is on hold",
      react: BookingHoldEmail({
        firstName: params.firstName,
        eventDate: params.eventDate,
        referenceCode: params.referenceCode,
        assetsBaseUrl: serverEnv.APP_URL ?? "",
      }),
    });
  },

  async sendMagicLink(params: { to: string; bookingReference: string; url: string }): Promise<void> {
    const resend = getResendClient();
    if (!resend) return;

    await resend.emails.send({
      from: `Memory Studio OC <${serverEnv.EMAIL_FROM}>`,
      to: params.to,
      subject: "View your Memory Studio booking",
      react: MagicLinkEmail({
        bookingReference: params.bookingReference,
        url: params.url,
        assetsBaseUrl: serverEnv.APP_URL ?? "",
      }),
    });
  },

  async sendContractSigned(params: {
    to: string;
    firstName: string;
    referenceCode: string;
    versionNumber: number;
    signedAt: Date;
  }): Promise<void> {
    const resend = getResendClient();
    if (!resend) return;

    await resend.emails.send({
      from: `Memory Studio OC <${serverEnv.EMAIL_FROM}>`,
      to: params.to,
      subject: "Your Memory Studio contract is signed",
      react: ContractSignedEmail({
        firstName: params.firstName,
        referenceCode: params.referenceCode,
        versionNumber: params.versionNumber,
        signedAt: params.signedAt.toLocaleString(),
        assetsBaseUrl: serverEnv.APP_URL ?? "",
      }),
    });
  },
};
