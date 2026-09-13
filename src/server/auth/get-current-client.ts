import { cookies } from "next/headers";

import { getClientSession } from "@/server/services/client-access";
import type { Booking } from "@/lib/db/schema";

export const CLIENT_SESSION_COOKIE = "ms_client_session";

/**
 * The single authorization choke point for the client portal. A booking is scoped to
 * exactly one session cookie value — never trust a booking id from the URL alone.
 */
export async function getCurrentClient(): Promise<{ booking: Booking } | null> {
  const cookieStore = await cookies();
  const rawSessionToken = cookieStore.get(CLIENT_SESSION_COOKIE)?.value;
  if (!rawSessionToken) return null;

  return getClientSession(rawSessionToken);
}
