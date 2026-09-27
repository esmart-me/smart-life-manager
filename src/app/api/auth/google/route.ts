// src/app/api/auth/google/route.ts
import { NextResponse } from "next/server";
import { isGoogleOAuthConfigured, getGoogleAuthUrl, getGoogleRedirectUri } from "@/lib/auth/google-oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const wantsJson =
    url.searchParams.get("format") === "json" ||
    request.headers.get("accept")?.includes("application/json");

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
              redirectUri: getGoogleRedirectUri(),
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

  const state = url.searchParams.get("state") || undefined;
  const googleAuthUrl = getGoogleAuthUrl(state);

  return NextResponse.redirect(googleAuthUrl);
}
