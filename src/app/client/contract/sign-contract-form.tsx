"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { signContractAction } from "./actions";

export function SignContractForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [signedName, setSignedName] = useState(defaultName);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await signContractAction({ signedName, accepted });
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
      <div>
        <Label htmlFor="signedName">Full legal name</Label>
        <Input
          id="signedName"
          required
          className="mt-1.5"
          value={signedName}
          onChange={(e) => setSignedName(e.target.value)}
        />
      </div>

      <div className="flex items-start gap-2">
        <Checkbox id="accepted" checked={accepted} onCheckedChange={(checked) => setAccepted(checked === true)} />
        <Label htmlFor="accepted" className="text-sm font-normal">
          I have read this contract and agree to its terms.
        </Label>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={isPending || !accepted}>
        {isPending ? "Signing…" : "Sign contract"}
      </Button>
    </form>
  );
}
