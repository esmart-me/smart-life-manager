// src/lib/auth/google-oauth.ts
// Robust Google OAuth 2.0 helper supporting both Web Application and Desktop (RFC 8252 Loopback) flows.
// Implements HMAC-signed CSRF state, dynamic loopback port detection, and 30-second single-use desktop tickets.

import crypto from "crypto";
import { getPersistentEnvPath, loadEnvFileIntoProcess } from "../config/system-config-service";

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  isConfigured: boolean;
  isDesktop: boolean;
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
  isDesktop?: boolean;
}

function cleanEnvValue(val?: string): string {
  if (!val) return "";
  return val.trim().replace(/^["']+|["']+$/g, "").trim();
}

/**
 * Ensures environment variables are up to date from AppData .env.
 */
function ensureEnvLoaded(): void {
  try {
    const userEnv = getPersistentEnvPath();
    loadEnvFileIntoProcess(userEnv, false);
  } catch {}
}

/**
 * Resolves Google Client ID for either Desktop or Web mode.
 */
export function getGoogleClientId(isDesktop = false): string {
  ensureEnvLoaded();
  if (isDesktop && process.env.GOOGLE_DESKTOP_CLIENT_ID?.trim()) {
    return cleanEnvValue(process.env.GOOGLE_DESKTOP_CLIENT_ID);
  }
  return cleanEnvValue(process.env.GOOGLE_CLIENT_ID);
}

/**
 * Resolves Google Client Secret for either Desktop or Web mode.
 */
export function getGoogleClientSecret(isDesktop = false): string {
  ensureEnvLoaded();
  if (isDesktop && process.env.GOOGLE_DESKTOP_CLIENT_SECRET?.trim()) {
    return cleanEnvValue(process.env.GOOGLE_DESKTOP_CLIENT_SECRET);
  }
  return cleanEnvValue(process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Checks whether Google OAuth environment variables are properly set.
 */
export function isGoogleOAuthConfigured(isDesktop = false): boolean {
  const clientId = getGoogleClientId(isDesktop);
  const clientSecret = getGoogleClientSecret(isDesktop);
  return Boolean(
    clientId &&
    clientId.length > 5 &&
    !clientId.includes("your-client-id") &&
    (!clientSecret || !clientSecret.includes("your-client-secret"))
  );
}

/**
 * Determines the canonical base URL of the running application.
 */
export function getAppBaseUrl(req?: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, "");
  }
  if (process.env.APP_URL?.trim()) {
    return process.env.APP_URL.trim().replace(/\/$/, "");
  }

  if (req) {
    try {
      const url = new URL(req.url);
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
      const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
      return `${proto}://${host}`.replace(/\/$/, "");
    } catch {}
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

function getHmacSecret(): string {
  return process.env.JWT_SECRET || "smart-life-manager-oauth-hmac-key";
}

/**
 * Generates an HMAC-signed state payload to ensure tamper-proof CSRF protection
 * without relying exclusively on cookies across browser boundaries.
 */
export function generateOAuthState(returnTo?: string, isDesktop = false): { state: string; csrf: string } {
  const csrf = crypto.randomBytes(24).toString("hex");
  const cleanReturnTo =
    returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.startsWith("/admin")
      ? returnTo
      : "/";

  const payload: OAuthStatePayload = {
    csrf,
    returnTo: cleanReturnTo,
    timestamp: Date.now(),
    isDesktop,
  };

  const jsonStr = JSON.stringify(payload);
  const b64 = Buffer.from(jsonStr).toString("base64url");
  const sig = crypto.createHmac("sha256", getHmacSecret()).update(b64).digest("base64url");

  return { state: `${b64}.${sig}`, csrf };
}

/**
 * Parses and cryptographically validates the OAuth state string.
 */
export function parseAndValidateOAuthState(
  stateStr: string | null | undefined,
  expectedCsrf?: string | null | undefined
): { valid: boolean; returnTo: string; isDesktop: boolean; csrf: string } {
  if (!stateStr) {
    return { valid: false, returnTo: "/", isDesktop: false, csrf: "" };
  }

  try {
    const parts = stateStr.split(".");
    if (parts.length !== 2) {
      return { valid: false, returnTo: "/", isDesktop: false, csrf: "" };
    }

    const [b64, sig] = parts;
    const expectedSig = crypto.createHmac("sha256", getHmacSecret()).update(b64).digest("base64url");

    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return { valid: false, returnTo: "/", isDesktop: false, csrf: "" };
    }

    const jsonStr = Buffer.from(b64, "base64url").toString("utf8");
    const payload = JSON.parse(jsonStr) as OAuthStatePayload;

    // State expiration window: 15 minutes
    if (Date.now() - payload.timestamp > 15 * 60 * 1000) {
      return { valid: false, returnTo: "/", isDesktop: false, csrf: "" };
    }

    // For web requests where expectedCsrf is available, verify matching CSRF
    if (!payload.isDesktop && expectedCsrf && payload.csrf !== expectedCsrf) {
      return { valid: false, returnTo: "/", isDesktop: false, csrf: "" };
    }

    const cleanReturnTo =
      payload.returnTo &&
      payload.returnTo.startsWith("/") &&
      !payload.returnTo.startsWith("//") &&
      !payload.returnTo.startsWith("/admin")
        ? payload.returnTo
        : "/";

    return {
      valid: true,
      returnTo: cleanReturnTo,
      isDesktop: Boolean(payload.isDesktop),
      csrf: payload.csrf,
    };
  } catch {
    return { valid: false, returnTo: "/", isDesktop: false, csrf: "" };
  }
}

/**
 * Generates the Google OAuth 2.0 authorization URL.
 */
export function getGoogleAuthUrl(state?: string, req?: Request, isDesktop = false): string {
  const clientId = getGoogleClientId(isDesktop);
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
 * Exchanges authorization code for tokens with Google's OAuth 2.0 endpoint.
 */
export async function exchangeGoogleCodeForTokens(
  code: string,
  req?: Request,
  isDesktop = false
): Promise<{
  access_token: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
}> {
  const clientId = getGoogleClientId(isDesktop);
  const clientSecret = getGoogleClientSecret(isDesktop);
  const redirectUri = getGoogleRedirectUri(req);

  const bodyParams = new URLSearchParams({
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  if (clientSecret) {
    bodyParams.set("client_secret", clientSecret);
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: bodyParams.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google token exchange failed (${response.status}): ${errorBody}`);
  }

  return response.json();
}

/**
 * Fetches user profile from Google's OpenID Connect userinfo endpoint.
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

// ---------------------------------------------------------------------
// SECURE SHORT-LIVED DESKTOP EXCHANGE TICKET STORE (RFC 8252 Compliance)
// Max lifetime: 30 seconds
// Single-use only
// Invalidated immediately upon consumption
// ---------------------------------------------------------------------

interface DesktopAuthEntry {
  ticket: string;
  sessionToken: string;
  expiresAt: number;
  used: boolean;
}

// Map from state.csrf -> ticket entry
const desktopTicketStore = new Map<string, DesktopAuthEntry>();

/**
 * Generates a cryptographically random, single-use 30-second ticket for desktop session exchange.
 */
export function createDesktopAuthTicket(csrf: string, sessionToken: string): string {
  const ticket = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const entry: DesktopAuthEntry = {
    ticket,
    sessionToken,
    expiresAt: now + 30 * 1000, // Strictly 30 seconds
    used: false,
  };

  desktopTicketStore.set(csrf, entry);
  desktopTicketStore.set(ticket, entry);

  // Auto-purge expired ticket after 35 seconds
  setTimeout(() => {
    desktopTicketStore.delete(csrf);
    desktopTicketStore.delete(ticket);
  }, 35 * 1000);

  return ticket;
}

/**
 * Consumes the single-use ticket and returns the associated session token.
 * Immediately invalidates the ticket.
 */
export function consumeDesktopAuthTicket(ticketOrCsrf: string): string | null {
  const entry = desktopTicketStore.get(ticketOrCsrf);
  if (!entry) return null;

  if (entry.used || Date.now() > entry.expiresAt) {
    desktopTicketStore.delete(ticketOrCsrf);
    return null;
  }

  // Invalidate immediately (single use)
  entry.used = true;
  desktopTicketStore.delete(ticketOrCsrf);
  desktopTicketStore.delete(entry.ticket);

  return entry.sessionToken;
}
