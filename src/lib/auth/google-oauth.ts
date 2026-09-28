// src/lib/auth/google-oauth.ts
// Robust Google OAuth 2.0 Client helper with CSRF state protection, dynamic host resolution, and OpenID Connect parsing

import crypto from "crypto";

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  isConfigured: boolean;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email_verified?: boolean;
}

export interface OAuthStatePayload {
  csrf: string;
  returnTo?: string;
  timestamp: number;
}

/**
 * Checks whether Google OAuth environment variables are properly set.
 * Validates that keys are non-empty and not dummy/placeholder values.
 */
export function isGoogleOAuthConfigured(): boolean {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return Boolean(
    clientId &&
    clientSecret &&
    clientId.length > 5 &&
    clientSecret.length > 5 &&
    !clientId.includes("your-client-id") &&
    !clientSecret.includes("your-client-secret")
  );
}

/**
 * Determines the canonical base URL of the running application.
 * Precedence:
 * 1. APP_URL / NEXT_PUBLIC_APP_URL environment variable
 * 2. Host header from incoming request (with protocol detection)
 * 3. Default fallback: http://localhost:3000
 */
export function getAppBaseUrl(req?: Request): string {
  if (process.env.APP_URL?.trim()) {
    return process.env.APP_URL.trim().replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, "");
  }

  if (req) {
    try {
      const url = new URL(req.url);
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
      const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
      return `${proto}://${host}`.replace(/\/$/, "");
    } catch {
      // Fallback
    }
  }

  return "http://localhost:3000";
}

/**
 * Returns the computed redirect URI for Google OAuth callbacks.
 */
export function getGoogleRedirectUri(req?: Request): string {
  const baseUrl = getAppBaseUrl(req);
  return `${baseUrl}/api/auth/google/callback`;
}

/**
 * Generates a cryptographically secure random state with CSRF protection token.
 */
export function generateOAuthState(returnTo?: string): { state: string; csrf: string } {
  const csrf = crypto.randomBytes(24).toString("hex");
  const cleanReturnTo =
    returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.startsWith("/admin")
      ? returnTo
      : "/";

  const payload: OAuthStatePayload = {
    csrf,
    returnTo: cleanReturnTo,
    timestamp: Date.now(),
  };

  const state = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { state, csrf };
}

/**
 * Parses and validates the state parameter returned by Google against the CSRF cookie.
 */
export function parseAndValidateOAuthState(
  stateStr: string | null | undefined,
  expectedCsrf: string | null | undefined
): { valid: boolean; returnTo: string } {
  if (!stateStr || !expectedCsrf) {
    return { valid: false, returnTo: "/" };
  }

  try {
    const jsonStr = Buffer.from(stateStr, "base64url").toString("utf8");
    const payload = JSON.parse(jsonStr) as OAuthStatePayload;

    if (!payload.csrf || payload.csrf !== expectedCsrf) {
      return { valid: false, returnTo: "/" };
    }

    // State expiration window: 15 minutes
    if (Date.now() - payload.timestamp > 15 * 60 * 1000) {
      return { valid: false, returnTo: "/" };
    }

    const cleanReturnTo =
      payload.returnTo &&
      payload.returnTo.startsWith("/") &&
      !payload.returnTo.startsWith("//") &&
      !payload.returnTo.startsWith("/admin")
        ? payload.returnTo
        : "/";

    return { valid: true, returnTo: cleanReturnTo };
  } catch {
    return { valid: false, returnTo: "/" };
  }
}

/**
 * Generates the Google OAuth 2.0 authorization URL.
 */
export function getGoogleAuthUrl(state?: string, req?: Request): string {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const redirectUri = getGoogleRedirectUri(req);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  if (state) {
    params.set("state", state);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchanges the authorization code from Google for access & ID tokens.
 */
export async function exchangeGoogleCodeForTokens(
  code: string,
  req?: Request
): Promise<{
  access_token: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri = getGoogleRedirectUri(req);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google token exchange failed (${response.status}): ${errorBody}`);
  }

  return response.json();
}

/**
 * Fetches the user profile from Google's OpenID Connect userinfo endpoint.
 */
export async function getGoogleUserProfile(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google userinfo fetch failed (${response.status}): ${errorBody}`);
  }

  return response.json();
}
