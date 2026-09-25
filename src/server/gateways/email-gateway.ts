import { Resend } from "resend";

import { serverEnv } from "@/lib/env";
import { InquiryReceivedEmail } from "@/lib/email/inquiry-received";
import { BookingHoldEmail } from "@/lib/email/booking-hold";
import { MagicLinkEmail } from "@/lib/email/magic-link";
import { ContractSignedEmail } from "@/lib/email/contract-signed";
import { BookingConfirmedEmail } from "@/lib/email/booking-confirmed";
import { CustomizationReminderEmail } from "@/lib/email/customization-reminder";
import { BalancePaidEmail } from "@/lib/email/balance-paid";
import { BalanceReminderEmail } from "@/lib/email/balance-reminder";

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

  async sendBookingConfirmed(params: {
    to: string;
    firstName: string;
    referenceCode: string;
    eventDate: string;
    amountPaid: string;
    remainingBalance: string;
  }): Promise<void> {
    const resend = getResendClient();
    if (!resend) return;

    await resend.emails.send({
      from: `Memory Studio OC <${serverEnv.EMAIL_FROM}>`,
      to: params.to,
      subject: "Your Memory Studio booking is confirmed",
      react: BookingConfirmedEmail({
        firstName: params.firstName,
        referenceCode: params.referenceCode,
        eventDate: params.eventDate,
        amountPaid: params.amountPaid,
        remainingBalance: params.remainingBalance,
        assetsBaseUrl: serverEnv.APP_URL ?? "",
      }),
    });
  },

  async sendCustomizationReminder(params: {
    to: string;
    firstName: string;
    referenceCode: string;
    dueAt: Date | null;
  }): Promise<void> {
    const resend = getResendClient();
    if (!resend) return;

    const base = (serverEnv.APP_URL ?? "").replace(/\/$/, "");

    await resend.emails.send({
      from: `Memory Studio OC <${serverEnv.EMAIL_FROM}>`,
      to: params.to,
      subject: "Personalize your Memory Studio guest book",
      react: CustomizationReminderEmail({
        firstName: params.firstName,
        referenceCode: params.referenceCode,
        dueDateLabel: params.dueAt
          ? params.dueAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
          : null,
        customizeUrl: `${base}/client/customize`,
        assetsBaseUrl: serverEnv.APP_URL ?? "",
      }),
    });
  },

  async sendBalancePaid(params: { to: string; firstName: string; referenceCode: string; amountPaid: string }): Promise<void> {
    const resend = getResendClient();
    if (!resend) return;

    await resend.emails.send({
      from: `Memory Studio OC <${serverEnv.EMAIL_FROM}>`,
      to: params.to,
      subject: "Your Memory Studio balance is paid in full",
      react: BalancePaidEmail({
        firstName: params.firstName,
        referenceCode: params.referenceCode,
        amountPaid: params.amountPaid,
        assetsBaseUrl: serverEnv.APP_URL ?? "",
      }),
    });
  },

  async sendBalanceReminder(params: {
    to: string;
    firstName: string;
    referenceCode: string;
    amountDue: string;
    dueAt: Date | null;
  }): Promise<void> {
    const resend = getResendClient();
    if (!resend) return;

    const base = (serverEnv.APP_URL ?? "").replace(/\/$/, "");

    await resend.emails.send({
      from: `Memory Studio OC <${serverEnv.EMAIL_FROM}>`,
      to: params.to,
      subject: "Your Memory Studio balance is due",
      react: BalanceReminderEmail({
        firstName: params.firstName,
        referenceCode: params.referenceCode,
        amountDue: params.amountDue,
        dueDateLabel: params.dueAt
          ? params.dueAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
          : null,
        paymentUrl: `${base}/client/payment`,
        assetsBaseUrl: serverEnv.APP_URL ?? "",
      }),
    });
  },
};
