import { Resend } from "resend";

import { serverEnv } from "@/lib/env";
import { InquiryReceivedEmail } from "@/lib/email/inquiry-received";
import { BookingHoldEmail } from "@/lib/email/booking-hold";

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
};
