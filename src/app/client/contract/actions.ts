"use server";

import { headers } from "next/headers";

import { getCurrentClient } from "@/server/auth/get-current-client";
import { signContractSchema } from "@/lib/validation/contract";
import { signContract, ContractAlreadySignedError } from "@/server/services/contracts";

export type SignContractResult = { ok: true } | { ok: false; error: string };

export async function signContractAction(raw: Record<string, unknown>): Promise<SignContractResult> {
  const current = await getCurrentClient();
  if (!current) {
    return { ok: false, error: "Your session has expired. Please request a new access link." };
  }

  const parsed = signContractSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter your full legal name and confirm you agree." };
  }

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = headerList.get("user-agent") || null;

  try {
    await signContract(current.booking.id, {
      signedName: parsed.data.signedName,
      signedEmail: current.booking.email,
      ip,
      userAgent,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof ContractAlreadySignedError) {
      return { ok: false, error: "This contract has already been signed." };
    }
    console.error("[signContractAction] Failed to sign contract:", error);
    return { ok: false, error: "Something went wrong on our end. Please try again in a moment." };
  }
}
