"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  lockCustomizationAction,
  unlockCustomizationAction,
  setCustomizationDueDateAction,
  setMaxPromptsAction,
  sendCustomizationReminderAction,
} from "./actions";

export type CustomizationAdminPanelProps = {
  bookingId: string;
  locked: boolean;
  dueDate: string; // "YYYY-MM-DD", or "" if unset
  maxPrompts: number;
};

export function CustomizationAdminPanel({ bookingId, locked, dueDate, maxPrompts }: CustomizationAdminPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dueDateInput, setDueDateInput] = useState(dueDate);
  const [maxPromptsInput, setMaxPromptsInput] = useState(String(maxPrompts));

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
      <div className="flex flex-wrap items-center gap-3">
        {locked ? (
          <Button type="button" variant="outline" disabled={isPending} onClick={() => run(() => unlockCustomizationAction(bookingId))}>
            Unlock customization
          </Button>
        ) : (
          <Button type="button" variant="outline" disabled={isPending} onClick={() => run(() => lockCustomizationAction(bookingId))}>
            Lock customization
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={isPending || locked}
          onClick={() => run(() => sendCustomizationReminderAction(bookingId))}
        >
          Send reminder email
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="dueDate">Due date</Label>
          <Input
            id="dueDate"
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
          onClick={() => run(() => setCustomizationDueDateAction(bookingId, { dueDate: dueDateInput }))}
        >
          Save due date
        </Button>

        <div>
          <Label htmlFor="maxPrompts">Max prompts</Label>
          <Input
            id="maxPrompts"
            type="number"
            min={1}
            max={50}
            className="mt-1.5 w-24"
            value={maxPromptsInput}
            onChange={(e) => setMaxPromptsInput(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => run(() => setMaxPromptsAction(bookingId, { maxPrompts: maxPromptsInput }))}
        >
          Save max prompts
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
