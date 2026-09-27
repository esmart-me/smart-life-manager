// src/app/api/auth/google/status/route.ts
import { NextResponse } from "next/server";
import { isGoogleOAuthConfigured, getGoogleRedirectUri } from "@/lib/auth/google-oauth";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isGoogleOAuthConfigured();
  const redirectUri = getGoogleRedirectUri();

  return NextResponse.json({
    success: true,
    data: {
      configured,
      provider: "google",
      redirectUri,
      requiredEnvVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
      instructions: configured
        ? "Google OAuth 2.0 is active and ready."
        : "Google OAuth credentials not found in environment. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google login.",
    },
  });
}
