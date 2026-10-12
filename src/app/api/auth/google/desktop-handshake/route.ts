// src/app/api/auth/google/desktop-handshake/route.ts
// Secure loopback handshake endpoint for Electron desktop application.
// Exchanges short-lived 30-second ticket for an authenticated session cookie.

import { NextResponse } from "next/server";
import { consumeDesktopAuthTicket } from "@/lib/auth/google-oauth";
import { setSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state")?.trim();

  if (!state) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Missing state identifier" } },
      { status: 400 }
    );
  }

  // Atomically consume single-use 30-second desktop exchange ticket
  const sessionToken = consumeDesktopAuthTicket(state);

  if (!sessionToken) {
    return NextResponse.json({
      success: false,
      pending: true,
      message: "Waiting for user authentication in system browser...",
    });
  }

  // Set authenticated session cookie on the response
  await setSessionCookie(sessionToken);

  console.log("[Google Desktop Handshake] Successfully consumed one-time ticket and established session.");

  return NextResponse.json({
    success: true,
    message: "Desktop authentication handshake completed successfully.",
    sessionToken,
    redirect: "/",
  });
}
