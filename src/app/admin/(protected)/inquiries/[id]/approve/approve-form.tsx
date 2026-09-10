"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { PACKAGES, ADD_ONS, formatPrice } from "@/config/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { approveInquiryAction } from "./actions";

type AddOnState = { included: boolean; quantity: number; unitPriceCents: number };

export function ApproveForm({ inquiryId }: { inquiryId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [packageId, setPackageId] = useState<string>(PACKAGES[0].id);
  const [packagePriceCents, setPackagePriceCents] = useState<number>(PACKAGES[0].priceCents);

  const [addOns, setAddOns] = useState<Record<string, AddOnState>>(() =>
    Object.fromEntries(
      ADD_ONS.map((addOn) => [addOn.catalogKey, { included: false, quantity: 1, unitPriceCents: addOn.defaultUnitPriceCents }]),
    ),
  );

  const selectedPackage = PACKAGES.find((p) => p.id === packageId) ?? PACKAGES[0];
  const includedAddOns = Object.entries(addOns).filter(([, state]) => state.included);
  const totalCents = packagePriceCents + includedAddOns.reduce((sum, [, state]) => sum + state.quantity * state.unitPriceCents, 0);
  const retainerCents = Math.round(totalCents * 0.3);

  function handlePackageChange(id: string | null) {
    const pkg = PACKAGES.find((p) => p.id === id);
    if (!pkg) return;
    setPackageId(pkg.id);
    setPackagePriceCents(pkg.priceCents);
  }

  function updateAddOn(key: string, patch: Partial<AddOnState>) {
    setAddOns((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const lineItems = [
      {
        itemType: "package" as const,
        catalogKey: `package.${packageId}`,
        description: selectedPackage.name,
        quantity: 1,
        unitPriceCents: packagePriceCents,
      },
      ...includedAddOns.map(([key, state]) => {
        const addOn = ADD_ONS.find((a) => a.catalogKey === key);
        return {
          itemType: "addon" as const,
          catalogKey: key,
          description: addOn?.name ?? key,
          quantity: state.quantity,
          unitPriceCents: state.unitPriceCents,
        };
      }),
    ];

    startTransition(async () => {
      const result = await approveInquiryAction(inquiryId, { lineItems });
      if (result.ok) {
        router.push(`/admin/bookings/${result.bookingId}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Package</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="package">Package</Label>
            <Select value={packageId} onValueChange={handlePackageChange}>
              <SelectTrigger id="package" className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PACKAGES.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name} — {formatPrice(pkg.priceCents)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="packagePrice">Approved price</Label>
            <Input
              id="packagePrice"
              type="number"
              min={0}
              className="mt-1.5"
              value={packagePriceCents / 100}
              onChange={(e) => setPackagePriceCents(Math.round(Number(e.target.value) * 100))}
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Add-ons</h2>
        <div className="mt-3 space-y-3">
          {ADD_ONS.map((addOn) => {
            const state = addOns[addOn.catalogKey];
            return (
              <div key={addOn.catalogKey} className="flex items-center gap-4 rounded-lg border border-border p-3">
                <Checkbox
                  checked={state.included}
                  onCheckedChange={(checked) => updateAddOn(addOn.catalogKey, { included: checked === true })}
                />
                <span className="flex-1 text-sm">
                  {addOn.name}
                  {addOn.isRange ? <span className="text-muted-foreground"> (adjustable)</span> : null}
                </span>
                {state.included ? (
                  <>
                    <Input
                      type="number"
                      min={1}
                      className="w-20"
                      value={state.quantity}
                      onChange={(e) => updateAddOn(addOn.catalogKey, { quantity: Math.max(1, Number(e.target.value)) })}
                    />
                    <Input
                      type="number"
                      min={0}
                      className="w-28"
                      value={state.unitPriceCents / 100}
                      onChange={(e) => updateAddOn(addOn.catalogKey, { unitPriceCents: Math.round(Number(e.target.value) * 100) })}
                    />
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex justify-between text-sm">
          <span>Total</span>
          <span className="font-semibold">{formatPrice(totalCents)}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm text-muted-foreground">
          <span>Required retainer (30%)</span>
          <span>{formatPrice(retainerCents)}</span>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Approving…" : "Approve and create hold"}
      </Button>
    </form>
  );
}
