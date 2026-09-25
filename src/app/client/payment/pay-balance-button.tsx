"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { startBalancePaymentAction } from "./actions";

export function PayBalanceButton({ amountLabel }: { amountLabel: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await startBalancePaymentAction();
      if (result.ok) {
        window.location.assign(result.url);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <Button type="button" onClick={handleClick} disabled={isPending}>
        {isPending ? "Redirecting to secure checkout…" : `Pay ${amountLabel} balance`}
      </Button>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
