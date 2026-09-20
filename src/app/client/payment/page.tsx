import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentClient } from "@/server/auth/get-current-client";
import { getBooking } from "@/server/services/bookings";
import { evaluateDepositEligibility, getDepositSummary } from "@/server/services/payments";
import { calculateRemainingBalanceCents, formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PayRetainerButton } from "./pay-retainer-button";
import { RefreshWhilePending } from "./refresh-while-pending";

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="mt-6 rounded-md border border-border bg-muted/40 p-4 text-sm">{children}</p>;
}

export default async function ClientPaymentPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const current = await getCurrentClient();
  if (!current) {
    redirect("/access");
  }

  // getBooking lazily expires a lapsed hold, so the state below is current.
  const result = await getBooking(current.booking.id);
  if (!result) {
    redirect("/access");
  }
  const { booking } = result;

  const { status } = await searchParams;
  const summary = await getDepositSummary(booking.id);

  let body: React.ReactNode;

  if (summary.flaggedPayment) {
    body = (
      <Notice>
        We received your payment of {formatMoney(summary.flaggedPayment.amountCents)}, but we need to review your booking before
        confirming it. We&apos;ll email you shortly — there&apos;s nothing else you need to do.
      </Notice>
    );
  } else if (booking.status === "confirmed" && summary.paidPayment) {
    body = (
      <>
        <Notice>
          Your booking is confirmed. We received your retainer of {formatMoney(summary.paidPayment.amountCents)}. Your remaining balance
          is {formatMoney(calculateRemainingBalanceCents(booking.totalCents, summary.paidPayment.amountCents))}.
        </Notice>
        <div className="mt-6">
          <Button variant="outline" render={<Link href="/client" />}>
            Back to your booking
          </Button>
        </div>
      </>
    );
  } else if (status === "success" && booking.status === "hold") {
    // Informational only — payment is never marked paid from this redirect (BR-PAY-004).
    body = (
      <>
        <RefreshWhilePending />
        <Notice>Thank you! We&apos;re confirming your payment with our payment provider. This page will update in a moment.</Notice>
      </>
    );
  } else if (booking.status !== "hold") {
    body = <Notice>This booking is {booking.status} and isn&apos;t awaiting a payment.</Notice>;
  } else {
    const eligibility = await evaluateDepositEligibility(booking.id);
    if (eligibility.ok) {
      body = (
        <div className="mt-6 space-y-4">
          {status === "cancelled" ? <Notice>Your payment wasn&apos;t completed. You can try again whenever you&apos;re ready.</Notice> : null}
          <dl className="rounded-lg border border-border p-4 text-sm">
            <div className="flex justify-between">
              <dt>Booking total</dt>
              <dd>{formatMoney(booking.totalCents)}</dd>
            </div>
            <div className="mt-2 flex justify-between font-semibold">
              <dt>Retainer due now (30%)</dt>
              <dd>{formatMoney(eligibility.dueCents)}</dd>
            </div>
          </dl>
          <p className="text-sm text-muted-foreground">
            Your date is held until {eligibility.holdExpiresAt.toLocaleString()}. Payments are handled securely by Stripe.
          </p>
          <PayRetainerButton amountLabel={formatMoney(eligibility.dueCents)} />
        </div>
      );
    } else if (eligibility.code === "contract_unsigned") {
      body = (
        <>
          <Notice>{eligibility.message}</Notice>
          <div className="mt-6">
            <Button render={<Link href="/client/contract" />}>View &amp; sign contract</Button>
          </div>
        </>
      );
    } else {
      body = <Notice>{eligibility.message}</Notice>;
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Retainer payment</h1>
          <p className="mt-1 text-sm text-muted-foreground">{booking.referenceCode}</p>
        </div>
        <Badge variant={booking.status === "confirmed" ? "secondary" : "default"}>{booking.status}</Badge>
      </div>
      {body}
    </div>
  );
}
