// src/lib/auth/google-oauth.ts

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

/**
 * Checks whether Google OAuth environment variables are properly set.
 */
export function isGoogleOAuthConfigured(): boolean {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return Boolean(clientId && clientSecret && clientId.length > 5 && clientSecret.length > 5);
}

/**
 * Returns the computed redirect URI for Google OAuth callbacks.
 */
export function getGoogleRedirectUri(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/api/auth/google/callback`;
}

/**
 * Generates the Google OAuth 2.0 authorization URL.
 */
export function getGoogleAuthUrl(state?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const redirectUri = getGoogleRedirectUri();

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
export async function exchangeGoogleCodeForTokens(code: string): Promise<{
  access_token: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri = getGoogleRedirectUri();

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
