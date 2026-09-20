import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

const SECRET = "whsec_route_test_secret";
const applyStripePaymentEvent = vi.fn();

vi.mock("@/server/services/payments", () => ({ applyStripePaymentEvent }));

const payload = JSON.stringify({ id: "evt_route_1", object: "event", type: "checkout.session.completed", data: { object: {} } });

function webhookRequest(body: string, signature: string | null) {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    body,
    headers: signature ? { "stripe-signature": signature } : {},
  });
}

describe("POST /api/stripe/webhook", () => {
  let POST: (request: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
    applyStripePaymentEvent.mockReset();
    ({ POST } = await import("./route"));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a request with no signature header without processing anything", async () => {
    const response = await POST(webhookRequest(payload, null));
    expect(response.status).toBe(400);
    expect(applyStripePaymentEvent).not.toHaveBeenCalled();
  });

  it("rejects a forged signature without processing anything", async () => {
    const forged = Stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_attacker" });
    const response = await POST(webhookRequest(payload, forged));
    expect(response.status).toBe(400);
    expect(applyStripePaymentEvent).not.toHaveBeenCalled();
  });

  it("processes a correctly signed event and acknowledges it", async () => {
    applyStripePaymentEvent.mockResolvedValue({ kind: "confirmed" });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });

    const response = await POST(webhookRequest(payload, signature));

    expect(response.status).toBe(200);
    expect(applyStripePaymentEvent).toHaveBeenCalledTimes(1);
    expect(applyStripePaymentEvent.mock.calls[0][0].id).toBe("evt_route_1");
  });

  it("returns 500 so Stripe retries when processing fails", async () => {
    applyStripePaymentEvent.mockRejectedValue(new Error("db down"));
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(webhookRequest(payload, signature));

    expect(response.status).toBe(500);
  });
});
