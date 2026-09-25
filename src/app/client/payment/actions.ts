"use server";

import { getCurrentClient } from "@/server/auth/get-current-client";
import { createBalanceCheckoutSession, createDepositCheckoutSession, PaymentNotAllowedError } from "@/server/services/payments";

export type StartPaymentResult = { ok: true; url: string } | { ok: false; error: string };

// No input: the booking comes from the client session and the amount from the database (BR-PAY-002).
export async function startRetainerPaymentAction(): Promise<StartPaymentResult> {
  const current = await getCurrentClient();
  if (!current) {
    return { ok: false, error: "Your session has expired. Please request a new access link." };
  }

  try {
    const { url } = await createDepositCheckoutSession(current.booking.id);
    return { ok: true, url };
  } catch (error) {
    if (error instanceof PaymentNotAllowedError) {
      return { ok: false, error: error.message };
    }
    console.error("[startRetainerPaymentAction] Failed to start payment:", error);
    return { ok: false, error: "We couldn't start your payment. Please try again in a moment." };
  }
}

export async function startBalancePaymentAction(): Promise<StartPaymentResult> {
  const current = await getCurrentClient();
  if (!current) {
    return { ok: false, error: "Your session has expired. Please request a new access link." };
  }

  try {
    const { url } = await createBalanceCheckoutSession(current.booking.id);
    return { ok: true, url };
  } catch (error) {
    if (error instanceof PaymentNotAllowedError) {
      return { ok: false, error: error.message };
    }
    console.error("[startBalancePaymentAction] Failed to start payment:", error);
    return { ok: false, error: "We couldn't start your payment. Please try again in a moment." };
  }
}
