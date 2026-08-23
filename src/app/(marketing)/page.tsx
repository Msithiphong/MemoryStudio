import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const VALUE_PROPS = [
  {
    title: "One booth, your day only",
    description:
      "We take a single event per date, so your guest book gets our full attention from setup to delivery.",
  },
  {
    title: "Private by design",
    description:
      "Your recordings are delivered through a secure, personal link. Nothing is public unless you choose to share it.",
  },
  {
    title: "Made to keep",
    description:
      "Every message is preserved as a lasting film you can revisit for anniversaries to come.",
  },
];

const PACKAGES = [
  { name: "Cocktail", price: "$499", blurb: "A focused guest book for intimate celebrations." },
  { name: "Signature", price: "$699", blurb: "Our most popular package, with more prompts and time." },
  { name: "Keepsake", price: "$949", blurb: "The full experience, built for weddings you'll replay for years." },
];

export default function Home() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-20 pb-16 text-center sm:pt-28 sm:pb-24">
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          A video and audio guest book your future selves will treasure
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground text-balance">
          Memory Studio brings a private recording booth to your wedding, so every guest can leave a message
          you&apos;ll actually watch again.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" render={<Link href="/inquiry" />}>
            Start Your Inquiry
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/how-it-works" />}>
            See How It Works
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Submitting an inquiry doesn&apos;t reserve your date — every request is reviewed before booking.
        </p>
      </section>

      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:grid-cols-3">
          {VALUE_PROPS.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Packages</h2>
            <p className="mt-2 text-muted-foreground">Three starting points — every booking is customized after inquiry.</p>
          </div>
          <Button variant="outline" render={<Link href="/packages" />}>
            Compare packages
          </Button>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {PACKAGES.map((pkg) => (
            <Card key={pkg.name}>
              <CardHeader>
                <CardTitle>{pkg.name}</CardTitle>
                <CardDescription>{pkg.blurb}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{pkg.price}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Ready to tell us about your day?</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
            Share your date and venue, and we&apos;ll follow up to confirm availability.
          </p>
          <div className="mt-6">
            <Button size="lg" render={<Link href="/inquiry" />}>
              Start Your Inquiry
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
