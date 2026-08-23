import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "How It Works",
  description: "The Memory Studio process, from inquiry to your finished wedding films.",
};

const STEPS = [
  {
    title: "1. Send an inquiry",
    description:
      "Tell us your date, venue, and which package interests you. This doesn't reserve anything yet — we review every request personally.",
  },
  {
    title: "2. We confirm your date",
    description:
      "Because we run a single booth, we can only hold one event per date. Once approved, we place a temporary hold while you review your details.",
  },
  {
    title: "3. Sign and secure your booking",
    description:
      "You'll get a private, secure link to review your agreement and pay a 30% retainer. Your booth is fully booked once that's confirmed.",
  },
  {
    title: "4. Customize your experience",
    description:
      "Add your names, a welcome message, and the prompts you want guests to answer, all from your private client page.",
  },
  {
    title: "5. Celebrate",
    description: "Our booth runs self-serve at your event, so guests can record a message whenever they're ready.",
  },
  {
    title: "6. Receive your films",
    description:
      "After your wedding, we prepare your recordings and publish them to a private gallery only you can access.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:py-24">
      <h1 className="text-4xl font-semibold tracking-tight">How It Works</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        From your first message to us to the day you watch your finished films, here is what to expect.
      </p>

      <ol className="mt-12 space-y-10">
        {STEPS.map((step) => (
          <li key={step.title} className="border-l-2 border-border pl-6">
            <h2 className="text-xl font-semibold">{step.title}</h2>
            <p className="mt-2 text-muted-foreground">{step.description}</p>
          </li>
        ))}
      </ol>

      <div className="mt-16 flex flex-col items-start gap-3 rounded-xl border border-border bg-muted/30 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Ready to check availability for your date?</p>
        <Button render={<Link href="/inquiry" />}>Start Your Inquiry</Button>
      </div>
    </div>
  );
}
