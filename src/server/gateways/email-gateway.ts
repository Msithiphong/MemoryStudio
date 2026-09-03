import { Resend } from "resend";

import { serverEnv } from "@/lib/env";
import { InquiryReceivedEmail } from "@/lib/email/inquiry-received";

export const EmailGateway = {
  async sendInquiryReceived(params: { to: string; firstName: string; eventDate: string }): Promise<void> {
    if (!serverEnv.RESEND_API_KEY || !serverEnv.EMAIL_FROM) {
      console.warn(
        "[EmailGateway] RESEND_API_KEY or EMAIL_FROM is not configured — skipping inquiry-received email.",
      );
      return;
    }

    const resend = new Resend(serverEnv.RESEND_API_KEY);
    await resend.emails.send({
      from: serverEnv.EMAIL_FROM,
      to: params.to,
      subject: "We received your Memory Studio inquiry",
      react: InquiryReceivedEmail({ firstName: params.firstName, eventDate: params.eventDate }),
    });
  },
};
