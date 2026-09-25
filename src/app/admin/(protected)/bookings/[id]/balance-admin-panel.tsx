"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setBalanceDueDateAction, sendBalanceReminderAction } from "./actions";

export type BalanceAdminPanelProps = {
  bookingId: string;
  dueDate: string; // "YYYY-MM-DD", or "" if unset
  remainingBalanceCents: number;
};

export function BalanceAdminPanel({ bookingId, dueDate, remainingBalanceCents }: BalanceAdminPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dueDateInput, setDueDateInput] = useState(dueDate);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="mt-4 space-y-4 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="balanceDueDate">Balance due date</Label>
          <Input
            id="balanceDueDate"
            type="date"
            className="mt-1.5"
            value={dueDateInput}
            onChange={(e) => setDueDateInput(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => run(() => setBalanceDueDateAction(bookingId, { dueDate: dueDateInput }))}
        >
          Save due date
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending || remainingBalanceCents <= 0}
          onClick={() => run(() => sendBalanceReminderAction(bookingId))}
        >
          Send balance reminder
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
