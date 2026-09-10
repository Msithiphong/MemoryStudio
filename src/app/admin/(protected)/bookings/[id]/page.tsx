import { notFound } from "next/navigation";

import { getBooking } from "@/server/services/bookings";
import { formatPrice } from "@/config/pricing";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BookingStatus } from "@/lib/db/schema";

const STATUS_VARIANTS: Record<BookingStatus, "default" | "secondary" | "outline" | "destructive"> = {
  hold: "default",
  confirmed: "secondary",
  expired: "destructive",
  cancelled: "destructive",
  completed: "secondary",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getBooking(id);

  if (!result) {
    notFound();
  }

  const { booking, lineItems, reservation } = result;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{booking.referenceCode}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{booking.primaryContactName}</p>
        </div>
        <Badge variant={STATUS_VARIANTS[booking.status]}>{booking.status}</Badge>
      </div>

      <dl className="mt-8 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
        <Field label="Email" value={booking.email} />
        <Field label="Phone" value={booking.phone} />
        <Field label="Partner" value={booking.partnerName} />
        <Field label="Event date" value={booking.eventDate} />
        <Field label="Venue" value={[booking.venueName, booking.venueCity, booking.venueState].filter(Boolean).join(", ")} />
        {booking.status === "hold" && reservation?.holdExpiresAt ? (
          <Field label="Hold expires" value={new Date(reservation.holdExpiresAt).toLocaleString()} />
        ) : null}
      </dl>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Line items</h2>
        <div className="mt-3 rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit price</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-muted-foreground">{item.itemType}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatPrice(item.unitPriceCents)}</TableCell>
                  <TableCell>{formatPrice(item.lineTotalCents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 ml-auto max-w-xs space-y-1">
          <div className="flex justify-between text-sm">
            <span>Total</span>
            <span className="font-semibold">{formatPrice(booking.totalCents)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Required retainer (30%)</span>
            <span>{formatPrice(booking.requiredRetainerCents)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
