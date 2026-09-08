"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { reviewInquiryAction } from "../actions";
import type { InquiryStatus } from "@/lib/db/schema";

const ACTIONS: { label: string; status: InquiryStatus; variant: "default" | "outline" | "destructive" }[] = [
  { label: "Mark Reviewing", status: "reviewing", variant: "outline" },
  { label: "Waitlist", status: "waitlisted", variant: "outline" },
  { label: "Decline", status: "declined", variant: "destructive" },
];

export function ReviewActions({ id, currentStatus }: { id: string; currentStatus: InquiryStatus }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (currentStatus === "converted") {
    return <p className="text-sm text-muted-foreground">This inquiry has been converted to a booking.</p>;
  }

  function handleClick(status: InquiryStatus) {
    startTransition(async () => {
      const result = await reviewInquiryAction(id, status);
      if (result.ok) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.filter((action) => action.status !== currentStatus).map((action) => (
        <Button key={action.status} variant={action.variant} disabled={isPending} onClick={() => handleClick(action.status)}>
          {action.label}
        </Button>
      ))}
    </div>
  );
}
