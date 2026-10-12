// src/app/api/auth/google/status/route.ts
// Returns configuration status for Google OAuth for Web and Desktop modes

import { NextResponse } from "next/server";
import { isGoogleOAuthConfigured, getGoogleRedirectUri } from "@/lib/auth/google-oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const isDesktop = url.searchParams.get("isDesktop") === "true";

  const configured = isGoogleOAuthConfigured(isDesktop);
  const redirectUri = getGoogleRedirectUri(request);

  return NextResponse.json({
    success: true,
    data: {
      configured,
      provider: "google",
      isDesktop,
      redirectUri,
      requiredEnvVars: isDesktop
        ? ["GOOGLE_DESKTOP_CLIENT_ID (or GOOGLE_CLIENT_ID)"]
        : ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
      instructions: configured
        ? isDesktop
          ? "Google Desktop OAuth 2.0 (RFC 8252 Loopback) is configured and active."
          : "Google Web OAuth 2.0 is active and ready."
        : isDesktop
        ? "Google Desktop OAuth is awaiting configuration. Please configure a Google Desktop Client ID in Admin Settings."
        : "Google OAuth credentials not found in environment. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google login.",
    },
  });
}
