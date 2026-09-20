import Stripe from "stripe";

import { serverEnv } from "@/lib/env";

let cached: Stripe | null = null;

function getStripe(): Stripe {
  if (cached) return cached;
  if (!serverEnv.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured. Set it in .env.local to enable payments.");
  }
  cached = new Stripe(serverEnv.STRIPE_SECRET_KEY);
  return cached;
}

// Stripe requires a Checkout Session to live between 30 minutes and 24 hours.
const MIN_SESSION_LIFETIME_SECONDS = 30 * 60;
const MAX_SESSION_LIFETIME_SECONDS = 24 * 60 * 60;

export type CheckoutSessionMetadata = {
  paymentId: string;
  bookingId: string;
  paymentType: "deposit";
};

export const StripeGateway = {
  /** Lifetime for a session so it ends with the hold where Stripe's 30-minute floor allows. */
  sessionExpiresAt(holdExpiresAt: Date, now: Date = new Date()): number {
    const desired = Math.floor(holdExpiresAt.getTime() / 1000);
    const nowSeconds = Math.floor(now.getTime() / 1000);
    return Math.min(Math.max(desired, nowSeconds + MIN_SESSION_LIFETIME_SECONDS + 60), nowSeconds + MAX_SESSION_LIFETIME_SECONDS - 60);
  },

  async createDepositCheckoutSession(params: {
    paymentId: string;
    bookingId: string;
    referenceCode: string;
    customerEmail: string;
    amountCents: number;
    currency: string;
    expiresAt: number;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ id: string; url: string }> {
    const metadata: CheckoutSessionMetadata = {
      paymentId: params.paymentId,
      bookingId: params.bookingId,
      paymentType: "deposit",
    };

    const session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: params.customerEmail,
        client_reference_id: params.referenceCode,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: params.currency,
              unit_amount: params.amountCents,
              product_data: { name: `Memory Studio retainer — ${params.referenceCode}` },
            },
          },
        ],
        metadata,
        payment_intent_data: { metadata },
        expires_at: params.expiresAt,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
      },
      // The payment row id is unique per attempt, so a network retry of this call can't create a second session.
      { idempotencyKey: `deposit-checkout-${params.paymentId}` },
    );

    if (!session.url) {
      throw new Error("Stripe did not return a Checkout URL.");
    }
    return { id: session.id, url: session.url };
  },

  async retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return getStripe().checkout.sessions.retrieve(sessionId);
  },

  async expireCheckoutSession(sessionId: string): Promise<void> {
    try {
      await getStripe().checkout.sessions.expire(sessionId);
    } catch (error) {
      // Already completed/expired — nothing to release.
      console.warn("[StripeGateway] Could not expire checkout session:", error instanceof Error ? error.message : error);
    }
  },

  /** Verifies the Stripe-Signature header against the exact raw request body. Throws on any mismatch. */
  constructWebhookEvent(rawBody: string, signature: string, secret: string | undefined = serverEnv.STRIPE_WEBHOOK_SECRET): Stripe.Event {
    if (!secret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
    }
    return Stripe.webhooks.constructEvent(rawBody, signature, secret);
  },
};
