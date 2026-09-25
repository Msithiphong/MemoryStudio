import { notFound } from "next/navigation";

import { getBooking } from "@/server/services/bookings";
import { PaymentRepository } from "@/server/repositories/payment-repository";
import { getOrCreateCurrentContract, NoActiveContractTemplateError } from "@/server/services/contracts";
import { getOrCreateCustomizationView } from "@/server/services/customizations";
import { calculateRemainingBalanceCents, formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CustomizationAdminPanel } from "./customization-admin-panel";
import { BalanceAdminPanel } from "./balance-admin-panel";
import type { BookingStatus, Contract } from "@/lib/db/schema";

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

  let contract: Contract | null = null;
  let contractError: string | null = null;
  try {
    contract = await getOrCreateCurrentContract(booking.id);
  } catch (error) {
    contractError = error instanceof NoActiveContractTemplateError ? error.message : "Could not load the contract.";
  }

  const payments = await PaymentRepository.listForBooking(booking.id);
  const flaggedPayments = payments.filter((p) => p.manualReviewReason);

  const netPaidCents = await PaymentRepository.sumReceivedCentsForBooking(booking.id);
  const remainingBalanceCents = calculateRemainingBalanceCents(booking.totalCents, netPaidCents);

  const { customization, prompts, locked, signageApplicable } = await getOrCreateCustomizationView(booking.id);

  return (
    <div>
      {flaggedPayments.length > 0 ? (
        <div role="alert" className="mb-6 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <p className="font-semibold text-destructive">Payment needs manual review</p>
          <p className="mt-1">
            Money was received, but this booking was not confirmed automatically. Check the payment in Stripe and decide how to proceed.
          </p>
          <ul className="mt-2 list-disc pl-5">
            {flaggedPayments.map((p) => (
              <li key={p.id}>
                {formatMoney(p.amountCents)} — {p.manualReviewReason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
                  <TableCell>{formatMoney(item.unitPriceCents)}</TableCell>
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
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Paid to date</span>
            <span>{formatMoney(netPaidCents)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold">
            <span>Remaining balance</span>
            <span>{formatMoney(remainingBalanceCents)}</span>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Contract</h2>
        {contractError ? (
          <p className="mt-2 text-sm text-destructive">{contractError}</p>
        ) : (
          <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            <Field
              label="Status"
              value={<Badge variant={contract!.status === "signed" ? "secondary" : "default"}>{contract!.status}</Badge>}
            />
            <Field label="Version" value={contract!.versionNumber} />
            <Field label="Signed by" value={contract!.signedName} />
            <Field label="Signed at" value={contract!.signedAt ? new Date(contract!.signedAt).toLocaleString() : null} />
          </dl>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Payments</h2>
        {payments.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No payment attempts yet.</p>
        ) : (
          <div className="mt-3 rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.paymentType}</TableCell>
                    <TableCell>
                      <Badge variant={p.manualReviewReason ? "destructive" : p.status === "paid" ? "secondary" : "outline"}>
                        {p.manualReviewReason ? `${p.status} — review` : p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatMoney(p.amountCents)}</TableCell>
                    <TableCell className="text-muted-foreground">{p.paidAt ? new Date(p.paidAt).toLocaleString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <BalanceAdminPanel
          bookingId={booking.id}
          dueDate={booking.balanceDueAt ? new Date(booking.balanceDueAt).toISOString().slice(0, 10) : ""}
          remainingBalanceCents={remainingBalanceCents}
        />
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Customization</h2>
          <Badge variant={locked ? "destructive" : customization.submittedAt ? "secondary" : "outline"}>
            {locked ? "Locked" : customization.submittedAt ? "Submitted" : "Not submitted"}
          </Badge>
        </div>

        <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <Field label="Display names" value={[customization.displayName1, customization.displayName2].filter(Boolean).join(" & ")} />
          <Field label="Welcome-screen message" value={customization.welcomeMessage} />
          {signageApplicable ? <Field label="Signage wording" value={customization.signageText} /> : null}
          <Field label="Notes to Memory Studio" value={customization.clientNotes} />
          <Field label="Submitted at" value={customization.submittedAt ? new Date(customization.submittedAt).toLocaleString() : null} />
          <Field label="Last updated" value={new Date(customization.updatedAt).toLocaleString()} />
        </dl>

        <div className="mt-4">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Recording prompts</p>
          {prompts.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">No prompts yet.</p>
          ) : (
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
              {prompts.map((p) => (
                <li key={p.id}>{p.promptText}</li>
              ))}
            </ol>
          )}
        </div>

        <CustomizationAdminPanel
          bookingId={booking.id}
          locked={locked}
          dueDate={booking.customizationDueAt ? new Date(booking.customizationDueAt).toISOString().slice(0, 10) : ""}
          maxPrompts={customization.maxPrompts}
        />
      </div>
    </div>
  );
}
