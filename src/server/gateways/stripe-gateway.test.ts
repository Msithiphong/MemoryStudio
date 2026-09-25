import { describe, expect, it } from "vitest";
import Stripe from "stripe";

import { StripeGateway } from "./stripe-gateway";

const SECRET = "whsec_test_secret";
const payload = JSON.stringify({ id: "evt_1", object: "event", type: "checkout.session.completed", data: { object: {} } });

function sign(body: string, secret: string) {
  return Stripe.webhooks.generateTestHeaderString({ payload: body, secret });
}

describe("StripeGateway.constructWebhookEvent", () => {
  it("accepts a correctly signed payload", () => {
    const event = StripeGateway.constructWebhookEvent(payload, sign(payload, SECRET), SECRET);
    expect(event.id).toBe("evt_1");
  });

  it("rejects a payload signed with a different secret", () => {
    expect(() => StripeGateway.constructWebhookEvent(payload, sign(payload, "whsec_other"), SECRET)).toThrow();
  });

  it("rejects a payload that was altered after signing", () => {
    const header = sign(payload, SECRET);
    expect(() => StripeGateway.constructWebhookEvent(payload.replace("evt_1", "evt_2"), header, SECRET)).toThrow();
  });

  it("rejects a garbage signature header", () => {
    expect(() => StripeGateway.constructWebhookEvent(payload, "not-a-signature", SECRET)).toThrow();
  });

  it("throws when no webhook secret is configured", () => {
    expect(() => StripeGateway.constructWebhookEvent(payload, sign(payload, SECRET), "")).toThrow(/STRIPE_WEBHOOK_SECRET/);
  });
});

describe("StripeGateway.sessionExpiresAt", () => {
  const now = new Date("2030-01-01T00:00:00Z");
  const nowSeconds = Math.floor(now.getTime() / 1000);

  it("ends with the hold when it expires within Stripe's allowed window", () => {
    const hold = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    expect(StripeGateway.sessionExpiresAt(hold, now)).toBe(Math.floor(hold.getTime() / 1000));
  });

  it("caps at just under 24 hours", () => {
    const hold = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    expect(StripeGateway.sessionExpiresAt(hold, now)).toBeLessThan(nowSeconds + 24 * 60 * 60);
  });

  it("never goes below Stripe's 30-minute minimum", () => {
    const hold = new Date(now.getTime() + 5 * 60 * 1000);
    expect(StripeGateway.sessionExpiresAt(hold, now)).toBeGreaterThan(nowSeconds + 30 * 60);
  });
});

describe("StripeGateway.standardSessionExpiresAt", () => {
  it("is just under Stripe's 24-hour maximum from now", () => {
    const now = new Date("2030-01-01T00:00:00Z");
    const nowSeconds = Math.floor(now.getTime() / 1000);
    const result = StripeGateway.standardSessionExpiresAt(now);
    expect(result).toBeLessThan(nowSeconds + 24 * 60 * 60);
    expect(result).toBeGreaterThan(nowSeconds + 23 * 60 * 60);
  });
});
