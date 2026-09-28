// src/app/api/auth/google/route.ts
// Initiates Google OAuth 2.0 flow with CSRF protection and dynamic redirect URI

import { NextResponse } from "next/server";
import {
  isGoogleOAuthConfigured,
  getGoogleAuthUrl,
  getGoogleRedirectUri,
  generateOAuthState,
} from "@/lib/auth/google-oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const wantsJson =
    url.searchParams.get("format") === "json" ||
    request.headers.get("accept")?.includes("application/json");

  const redirectUri = getGoogleRedirectUri(request);

  if (!isGoogleOAuthConfigured()) {
    if (wantsJson) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "GOOGLE_OAUTH_NOT_CONFIGURED",
            message:
              "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables.",
            details: {
              requiredEnv: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
              redirectUri,
              consoleInstructions:
                "In Google Cloud Console (APIs & Services > Credentials), add this redirect URI to your OAuth 2.0 Web Client.",
            },
          },
        },
        { status: 503 }
      );
    }

    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(loginUrl);
  }

  // Generate cryptographically random CSRF state token
  const rawReturnTo = url.searchParams.get("returnTo") || url.searchParams.get("state") || "/";
  const { state, csrf } = generateOAuthState(rawReturnTo);
  const googleAuthUrl = getGoogleAuthUrl(state, request);

  const response = NextResponse.redirect(googleAuthUrl);

  // Set CSRF token in a secure, httpOnly cookie (15 min validity)
  const isHttps = url.protocol === "https:" || process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") || false;
  response.cookies.set("google_oauth_state", csrf, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60, // 15 minutes
  });

  return response;
}
