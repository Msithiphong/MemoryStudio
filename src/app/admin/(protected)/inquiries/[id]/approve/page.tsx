import { notFound } from "next/navigation";

import { getInquiry } from "@/server/services/inquiries";
import { ApproveForm } from "./approve-form";

export default async function ApproveInquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inquiry = await getInquiry(id);

  if (!inquiry) {
    notFound();
  }
  if (inquiry.status === "converted") {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Approve inquiry — {inquiry.firstName} {inquiry.lastName ?? ""}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Event date: {inquiry.eventDate}. This will reserve the date and mark the inquiry converted.
      </p>

      <div className="mt-8">
        <ApproveForm inquiryId={inquiry.id} />
      </div>
    </div>
  );
}
