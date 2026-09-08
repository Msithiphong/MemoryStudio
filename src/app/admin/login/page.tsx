"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginResult } from "./actions";

export default function AdminLoginPage() {
  const [state, formAction, isPending] = useActionState<LoginResult | null, FormData>(loginAction, null);

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold tracking-tight">Admin sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">Memory Studio inquiry dashboard.</p>

      <form action={formAction} className="mt-8 space-y-5">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required className="mt-1.5" autoComplete="email" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1.5"
            autoComplete="current-password"
          />
        </div>

        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
