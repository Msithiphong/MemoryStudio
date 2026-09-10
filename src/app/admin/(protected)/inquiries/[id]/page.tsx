import { notFound } from "next/navigation";
import Link from "next/link";

import { getInquiry } from "@/server/services/inquiries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReviewActions } from "./review-actions";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

export default async function AdminInquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inquiry = await getInquiry(id);

  if (!inquiry) {
    notFound();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {inquiry.firstName} {inquiry.lastName ?? ""}
        </h1>
        <Badge>{inquiry.status}</Badge>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <ReviewActions id={inquiry.id} currentStatus={inquiry.status} />
        {inquiry.status !== "converted" ? (
          <Button render={<Link href={`/admin/inquiries/${inquiry.id}/approve`} />}>Approve</Button>
        ) : null}
      </div>

      <dl className="mt-8 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
        <Field label="Email" value={inquiry.email} />
        <Field label="Phone" value={inquiry.phone} />
        <Field label="Partner" value={[inquiry.partnerFirstName, inquiry.partnerLastName].filter(Boolean).join(" ")} />
        <Field label="Event type" value={inquiry.eventType} />
        <Field label="Event date" value={inquiry.eventDate} />
        <Field
          label="Venue"
          value={[inquiry.venueName, inquiry.venueCity, inquiry.venueState].filter(Boolean).join(", ")}
        />
        <Field label="Estimated guests" value={inquiry.estimatedGuestCount} />
        <Field label="Package interest" value={inquiry.packageInterest} />
        <Field label="Lead source" value={inquiry.leadSource} />
        <Field label="Submitted" value={new Date(inquiry.createdAt).toLocaleString()} />
      </dl>

      {inquiry.message ? (
        <div className="mt-6">
          <dt className="text-xs tracking-wide text-muted-foreground uppercase">Message</dt>
          <dd className="mt-1 text-sm whitespace-pre-wrap">{inquiry.message}</dd>
        </div>
      ) : null}
    </div>
  );
}
