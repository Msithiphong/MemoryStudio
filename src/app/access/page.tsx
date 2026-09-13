import type { Metadata } from "next";

import { RequestAccessForm } from "./request-access-form";

export const metadata: Metadata = {
  title: "Access Your Booking",
  description: "Enter your email to receive a secure link to your Memory Studio booking.",
};

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:py-24">
      <h1 className="text-2xl font-semibold tracking-tight">Access your booking</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the email on your booking and we&apos;ll send you a secure link to view it.
      </p>

      {error === "invalid" ? (
        <p className="mt-4 text-sm text-destructive">
          That link is invalid or has expired. Request a new one below.
        </p>
      ) : null}

      <div className="mt-8">
        <RequestAccessForm />
      </div>
    </div>
  );
}
