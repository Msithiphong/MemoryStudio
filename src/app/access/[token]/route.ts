import { NextResponse, type NextRequest } from "next/server";

import { redeemMagicLink } from "@/server/services/client-access";
import { CLIENT_SESSION_COOKIE } from "@/server/auth/get-current-client";

const SESSION_DURATION_SECONDS = 30 * 24 * 60 * 60; // 30 days, matching client-access.ts

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  try {
    const { rawSessionToken } = await redeemMagicLink(token);

    const response = NextResponse.redirect(new URL("/client", request.url));
    response.cookies.set(CLIENT_SESSION_COOKIE, rawSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });
    return response;
  } catch {
    const response = NextResponse.redirect(new URL("/access?error=invalid", request.url));
    return response;
  }
}
