import Link from "next/link";
import type { Metadata } from "next";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Packages",
  description: "Compare Memory Studio's Cocktail, Signature, and Keepsake wedding guest book packages.",
};

const PACKAGES = [
  {
    name: "Cocktail",
    price: "$499",
    blurb: "A focused guest book for intimate celebrations.",
    features: ["Recording booth for your event", "About 3 guided prompts", "Private digital gallery"],
  },
  {
    name: "Signature",
    price: "$699",
    blurb: "Our most requested package, with more time and prompts.",
    features: ["Recording booth for your event", "About 5 guided prompts", "Private digital gallery", "Extended rental hours available"],
    featured: true,
  },
  {
    name: "Keepsake",
    price: "$949",
    blurb: "The full experience, built for weddings you'll replay for years.",
    features: [
      "Recording booth for your event",
      "Full Signature-level customization",
      "Private digital gallery",
      "Priority scheduling",
    ],
  },
];

const ADD_ONS = [
  { name: "Additional rental hour", price: "$100" },
  { name: "Edited keepsake film", price: "Starting at $200" },
  { name: "Booth attendant", price: "Starting at $75/hour" },
  { name: "Premium backdrop", price: "Starting at $150" },
  { name: "Custom signage", price: "Starting at $75" },
  { name: "Animated welcome screen", price: "Starting at $75" },
  { name: "Rush delivery", price: "Starting at $150" },
  { name: "Extended cloud archive", price: "Starting at $50" },
  { name: "Anniversary video edit", price: "Starting at $150" },
];

export default function PackagesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
      <h1 className="text-4xl font-semibold tracking-tight">Packages</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Every package includes our booth, setup, and a private gallery for delivery. Final pricing and add-ons are
        confirmed together after your inquiry is reviewed.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {PACKAGES.map((pkg) => (
          <Card
            key={pkg.name}
            className={`h-full flex-col ${pkg.featured ? "ring-2 ring-primary" : ""}`}
          >
            <CardHeader>
              <CardTitle>{pkg.name}</CardTitle>
              <CardDescription>{pkg.blurb}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <p className="text-3xl font-semibold">{pkg.price}</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" render={<Link href="/inquiry" />}>
                Inquire About {pkg.name}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">Add-ons</h2>
        <p className="mt-2 text-muted-foreground">Available to add to any package during your booking review.</p>
        <div className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {ADD_ONS.map((addon) => (
            <div key={addon.name} className="flex items-center justify-between border-b border-border py-2">
              <span className="text-sm">{addon.name}</span>
              <span className="text-sm text-muted-foreground">{addon.price}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
