import { InquiryRepository } from "@/server/repositories/inquiry-repository";
import { EmailGateway } from "@/server/gateways/email-gateway";
import type { NewInquiry, Inquiry } from "@/lib/db/schema";

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
