import { NextResponse } from "next/server";

import { StripeGateway } from "@/server/gateways/stripe-gateway";
import { applyStripePaymentEvent } from "@/server/services/payments";

// Signature verification needs the exact raw body, so read it as text and never as parsed JSON.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event;
  try {
    event = StripeGateway.constructWebhookEvent(rawBody, signature);
  } catch (error) {
    console.warn("[stripe webhook] Rejected event:", error instanceof Error ? error.message : "verification failed");
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    const outcome = await applyStripePaymentEvent(event);
    return NextResponse.json({ received: true, outcome: outcome.kind });
  } catch (error) {
    // Non-2xx makes Stripe retry; the ledger insert rolled back with the failed transaction, so the retry runs for real.
    console.error(`[stripe webhook] Failed to process ${event.type} (${event.id}):`, error);
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }
}
