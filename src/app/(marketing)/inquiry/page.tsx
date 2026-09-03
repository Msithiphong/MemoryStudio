import type { Metadata } from "next";

import { InquiryForm } from "./inquiry-form";

export const metadata: Metadata = {
  title: "Start Your Inquiry",
  description: "Tell Memory Studio about your wedding day to check availability.",
};

export default function InquiryPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <h1 className="text-4xl font-semibold tracking-tight">Start Your Inquiry</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Tell us about your day. We review every inquiry by hand and follow up to confirm availability before
        anything is booked.
      </p>

      <div className="mt-10">
        <InquiryForm />
      </div>
    </div>
  );
}
