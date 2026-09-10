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

/**
 * Internal catalog for the admin booking-approval form — distinct from the public
 * /packages page's marketing copy. Per BUSINESS_RULES.md BR-PRC-008, price ranges
 * must be resolved to one exact approved amount before a booking is created; these
 * defaults (the low end of each stated range) are a starting point the admin can
 * always override per line item, never a locked price.
 */
export type AddOn = {
  catalogKey: string;
  name: string;
  defaultUnitPriceCents: number;
  isRange: boolean;
};

export const ADD_ONS: AddOn[] = [
  { catalogKey: "addon.extra_hour", name: "Additional rental hour", defaultUnitPriceCents: 10_000, isRange: false },
  { catalogKey: "addon.keepsake_film", name: "Edited keepsake film", defaultUnitPriceCents: 20_000, isRange: true },
  { catalogKey: "addon.booth_attendant", name: "Booth attendant (per hour)", defaultUnitPriceCents: 7_500, isRange: false },
  { catalogKey: "addon.premium_backdrop", name: "Premium backdrop", defaultUnitPriceCents: 15_000, isRange: true },
  { catalogKey: "addon.custom_signage", name: "Custom signage", defaultUnitPriceCents: 7_500, isRange: false },
  { catalogKey: "addon.animated_welcome_screen", name: "Animated welcome screen", defaultUnitPriceCents: 7_500, isRange: false },
  { catalogKey: "addon.rush_delivery", name: "Rush delivery", defaultUnitPriceCents: 15_000, isRange: false },
  { catalogKey: "addon.extended_cloud_archive", name: "Extended cloud archive", defaultUnitPriceCents: 5_000, isRange: false },
  { catalogKey: "addon.anniversary_video_edit", name: "Anniversary video edit", defaultUnitPriceCents: 15_000, isRange: true },
];
