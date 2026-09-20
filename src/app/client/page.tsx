import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentClient } from "@/server/auth/get-current-client";
import { getBooking } from "@/server/services/bookings";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default async function ClientOverviewPage() {
  const current = await getCurrentClient();
  if (!current) {
    redirect("/access");
  }

  const result = await getBooking(current.booking.id);
  if (!result) {
    redirect("/access");
  }

  const { booking, lineItems, reservation } = result;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your booking</h1>
          <p className="mt-1 text-sm text-muted-foreground">{booking.referenceCode}</p>
        </div>
        <Badge variant={STATUS_VARIANTS[booking.status]}>{booking.status}</Badge>
      </div>

      <dl className="mt-8 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
        <Field label="Event date" value={booking.eventDate} />
        <Field label="Venue" value={[booking.venueName, booking.venueCity, booking.venueState].filter(Boolean).join(", ")} />
        {booking.status === "hold" && reservation?.holdExpiresAt ? (
          <Field label="Hold expires" value={new Date(reservation.holdExpiresAt).toLocaleString()} />
        ) : null}
      </dl>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">What&apos;s included</h2>
        <div className="mt-3 rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatMoney(item.lineTotalCents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 ml-auto max-w-xs space-y-1">
          <div className="flex justify-between text-sm">
            <span>Total</span>
            <span className="font-semibold">{formatMoney(booking.totalCents)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Required retainer (30%)</span>
            <span>{formatMoney(booking.requiredRetainerCents)}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button variant={booking.status === "hold" ? "outline" : "default"} render={<Link href="/client/contract" />}>
          View &amp; sign contract
        </Button>
        <Button variant="outline" render={<Link href="/client/payment" />}>
          {booking.status === "hold" ? "Pay retainer" : "Payment status"}
        </Button>
      </div>
    </div>
  );
}
