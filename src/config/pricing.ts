export type Package = {
  id: "moment" | "signature" | "keepsake";
  name: string;
  priceCents: number;
  blurb: string;
  featured?: boolean;
};

export const PACKAGES: Package[] = [
  {
    id: "moment",
    name: "Moment",
    priceCents: 49_900,
    blurb: "A focused guest book for intimate celebrations.",
  },
  {
    id: "signature",
    name: "Signature",
    priceCents: 69_900,
    blurb: "Our most popular package, with more prompts and time.",
    featured: true,
  },
  {
    id: "keepsake",
    name: "Keepsake",
    priceCents: 94_900,
    blurb: "The full experience, built for weddings you'll replay for years.",
  },
];

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export const FOUNDERS_DISCOUNT_CENTS = 10_000;

export function getFoundersPriceCents(priceCents: number): number {
  return priceCents - FOUNDERS_DISCOUNT_CENTS;
}
