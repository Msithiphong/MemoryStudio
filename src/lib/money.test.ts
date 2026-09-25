import { describe, expect, it } from "vitest";

import {
  calculateOverpaidCents,
  calculateRemainingBalanceCents,
  calculateRetainerCents,
  calculateRetainerDueCents,
  formatMoney,
} from "./money";

describe("calculateRetainerCents", () => {
  it("is 30% of the total", () => {
    expect(calculateRetainerCents(69_900)).toBe(20_970);
    expect(calculateRetainerCents(49_900)).toBe(14_970);
    expect(calculateRetainerCents(94_900)).toBe(28_470);
  });

  it("rounds to the nearest cent", () => {
    expect(calculateRetainerCents(10_001)).toBe(3_000); // 3000.3
    expect(calculateRetainerCents(10_002)).toBe(3_001); // 3000.6
    expect(calculateRetainerCents(5)).toBe(2); // 1.5 rounds up
  });

  it("handles zero", () => {
    expect(calculateRetainerCents(0)).toBe(0);
  });
});

describe("calculateRetainerDueCents", () => {
  it("subtracts already-paid deposits", () => {
    expect(calculateRetainerDueCents(20_970, 0)).toBe(20_970);
    expect(calculateRetainerDueCents(20_970, 5_000)).toBe(15_970);
  });

  it("is zero once fully paid or overpaid", () => {
    expect(calculateRetainerDueCents(20_970, 20_970)).toBe(0);
    expect(calculateRetainerDueCents(20_970, 25_000)).toBe(0);
  });
});

describe("calculateRemainingBalanceCents", () => {
  it("is total minus the retainer for the simple V1 flow", () => {
    const total = 69_900;
    const retainer = calculateRetainerCents(total);
    expect(calculateRemainingBalanceCents(total, retainer)).toBe(48_930);
  });

  it("is never negative", () => {
    expect(calculateRemainingBalanceCents(10_000, 12_000)).toBe(0);
  });
});

describe("formatMoney", () => {
  it("shows exact cents rather than rounding to whole dollars", () => {
    expect(formatMoney(20_970)).toBe("$209.70");
    expect(formatMoney(48_930)).toBe("$489.30");
    expect(formatMoney(1)).toBe("$0.01");
  });

  it("omits the cents for whole-dollar amounts", () => {
    expect(formatMoney(69_900)).toBe("$699");
    expect(formatMoney(0)).toBe("$0");
  });

  it("agrees with the amount actually charged for every standard package", () => {
    for (const total of [49_900, 69_900, 94_900]) {
      const retainer = calculateRetainerCents(total);
      expect(Math.round(parseFloat(formatMoney(retainer).replace(/[$,]/g, "")) * 100)).toBe(retainer);
    }
  });
});

describe("calculateOverpaidCents", () => {
  it("is zero when net paid does not exceed the total", () => {
    expect(calculateOverpaidCents(69_900, 69_900)).toBe(0);
    expect(calculateOverpaidCents(50_000, 69_900)).toBe(0);
  });

  it("is the excess when net paid exceeds the total", () => {
    expect(calculateOverpaidCents(70_000, 69_900)).toBe(100);
  });
});
