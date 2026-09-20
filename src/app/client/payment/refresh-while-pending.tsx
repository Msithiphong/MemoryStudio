"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 3_000;
const MAX_ATTEMPTS = 10;

/** The webhook, not this page, confirms the booking — so after a Stripe redirect we just re-read our own state for a short while. */
export function RefreshWhilePending() {
  const router = useRouter();

  useEffect(() => {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      router.refresh();
      if (attempts >= MAX_ATTEMPTS) clearInterval(timer);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [router]);

  return null;
}
