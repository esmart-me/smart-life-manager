// src/app/api/auth/google/route.ts
// Initiates Google OAuth 2.0 flow for Web and Windows Desktop environments

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

  const isDesktop = url.searchParams.get("isDesktop") === "true";
  const redirectUri = getGoogleRedirectUri(request);

  if (!isGoogleOAuthConfigured(isDesktop)) {
    if (wantsJson) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "GOOGLE_OAUTH_NOT_CONFIGURED",
            message: isDesktop
              ? "Google Desktop OAuth is not configured. Please configure Google Desktop Client ID in Admin Settings."
              : "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment.",
            details: {
              isDesktop,
              redirectUri,
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

  // Generate cryptographically signed random state with CSRF token
  const rawReturnTo = url.searchParams.get("returnTo") || "/";
  const { state, csrf } = generateOAuthState(rawReturnTo, isDesktop);
  const googleAuthUrl = getGoogleAuthUrl(state, request, isDesktop);

  if (wantsJson) {
    return NextResponse.json({
      success: true,
      authUrl: googleAuthUrl,
      csrf,
      redirectUri,
      isDesktop,
    });
  }

  const response = NextResponse.redirect(googleAuthUrl);

  // Set CSRF token in a secure, httpOnly cookie for web browser flows
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
