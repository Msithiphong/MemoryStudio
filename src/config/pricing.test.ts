import { describe, expect, it } from "vitest";
import { FOUNDERS_DISCOUNT_CENTS, PACKAGES, formatPrice, getFoundersPriceCents } from "./pricing";

describe("formatPrice", () => {
  it("formats whole-dollar cents with no decimals", () => {
    expect(formatPrice(49_900)).toBe("$499");
  });

  it("rounds down to the nearest dollar for a non-round cents value", () => {
    expect(formatPrice(4_999)).toBe("$50");
  });

  it("formats zero as $0", () => {
    expect(formatPrice(0)).toBe("$0");
  });
});

describe("getFoundersPriceCents", () => {
  it("subtracts the flat founders discount from a price", () => {
    expect(getFoundersPriceCents(49_900)).toBe(39_900);
    expect(getFoundersPriceCents(69_900)).toBe(59_900);
    expect(getFoundersPriceCents(94_900)).toBe(84_900);
  });

  it("uses a $100 discount", () => {
    expect(FOUNDERS_DISCOUNT_CENTS).toBe(10_000);
  });
});

describe("PACKAGES", () => {
  it("has a unique id for every package", () => {
    const ids = PACKAGES.map((pkg) => pkg.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every package a positive price", () => {
    for (const pkg of PACKAGES) {
      expect(pkg.priceCents).toBeGreaterThan(0);
    }
  });

  it("marks exactly one package as featured", () => {
    expect(PACKAGES.filter((pkg) => pkg.featured).length).toBe(1);
  });
});
