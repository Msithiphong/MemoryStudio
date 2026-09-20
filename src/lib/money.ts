/** BR-PAY-001: the retainer is 30% of the approved booking total, rounded to the nearest cent. */
export const RETAINER_RATE = 0.3;

export function calculateRetainerCents(totalCents: number): number {
  return Math.round(totalCents * RETAINER_RATE);
}

/** Retainer still owed after any already-paid deposit payments; never negative. */
export function calculateRetainerDueCents(requiredRetainerCents: number, paidDepositCents: number): number {
  return Math.max(0, requiredRetainerCents - paidDepositCents);
}

/** BUSINESS_RULES "Remaining Balance" for the simple V1 flow: total minus successful payments; never negative. */
export function calculateRemainingBalanceCents(totalCents: number, paidCents: number): number {
  return Math.max(0, totalCents - paidCents);
}

/** Exact display of an integer-cents amount: "$209.70", or "$699" when there are no cents. Use this (not the marketing `formatPrice`, which rounds to whole dollars) anywhere a retainer, payment, or booking total is shown. */
export function formatMoney(cents: number): string {
  const hasCents = cents % 100 !== 0;
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
}
