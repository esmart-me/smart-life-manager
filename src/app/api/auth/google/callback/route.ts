// src/app/api/auth/google/callback/route.ts
// Secure Google OAuth 2.0 callback handler supporting Web and Windows Desktop loopback authentication.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import {
  createSessionToken,
  setSessionCookie,
  setAdminSessionCookie,
  isAuthorizedOwnerAdmin,
} from "@/lib/auth/session";
import {
  isGoogleOAuthConfigured,
  exchangeGoogleCodeForTokens,
  getGoogleUserProfile,
  parseAndValidateOAuthState,
  createDesktopAuthTicket,
} from "@/lib/auth/google-oauth";
import { UserRole } from "@/types";
import { hashPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

function renderDesktopSuccessPage(): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Authentication Successful - Smart Life Manager</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #090d16;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 16px;
    }
    .card {
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 40px 32px;
      text-align: center;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(16px);
    }
    .icon {
      width: 64px;
      height: 64px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      color: #10b981;
      font-size: 32px;
      font-weight: bold;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 10px;
      color: #ffffff;
    }
    p {
      font-size: 13px;
      color: #94a3b8;
      line-height: 1.6;
      margin: 0 0 24px;
    }
    .badge {
      display: inline-block;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #818cf8;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <div class="badge">Desktop Authentication</div>
    <h1>Authentication Successful</h1>
    <p>Your Google account has been verified. You may now close this browser tab and return to the <strong>Smart Life Manager</strong> desktop application.</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");

  const loginRedirect = async (paramKey: string, paramValue: string) => {
    const dest = new URL("/login", url.origin);
    dest.searchParams.set(paramKey, paramValue);
    const res = NextResponse.redirect(dest);
    res.cookies.set("google_oauth_state", "", { maxAge: 0, path: "/" });
    return res;
  };

  // 1. Handle error responses returned by Google
  if (error) {
    console.error("[Google OAuth Callback] Error reported by Google:", error);
    if (error === "access_denied") {
      return loginRedirect("error", "google_access_denied");
    }
    return loginRedirect("error", `google_${error}`);
  }

  // 2. Validate authorization code
  if (!code) {
    return loginRedirect("error", "missing_code");
  }

  // 3. Cryptographically validate state
  const cookieStore = await cookies();
  const expectedCsrf = cookieStore.get("google_oauth_state")?.value;
  const stateData = parseAndValidateOAuthState(state, expectedCsrf);

  if (!stateData.valid) {
    console.warn("[Google OAuth Callback] State cryptographic validation failed");
    return loginRedirect("error", "google_invalid_state");
  }

  const isDesktop = stateData.isDesktop;

  // 4. Verify server configuration for mode
  if (!isGoogleOAuthConfigured(isDesktop)) {
    return loginRedirect("error", "google_not_configured");
  }

  try {
    // 5. Exchange code for access token
    const tokenData = await exchangeGoogleCodeForTokens(code, request, isDesktop);
    if (!tokenData.access_token) {
      throw new Error("No access_token returned by Google");
    }

    // 6. Fetch verified user profile from Google OpenID Connect endpoint
    const profile = await getGoogleUserProfile(tokenData.access_token);
    if (!profile.email) {
      throw new Error("Google profile did not contain a valid email address");
    }

    const normalizedEmail = profile.email.trim().toLowerCase();

    // 7. Secure Customer Identity Mapping: find existing account or create new customer
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        profile: true,
        userSubscription: true,
      },
    });

    if (!user) {
      // Create new customer account authenticated via Google (role is strictly 'user', NEVER 'admin')
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const passwordHash = await hashPassword(randomPassword);

      const firstName = profile.given_name || profile.name?.split(" ")[0] || "Customer";
      const lastName =
        profile.family_name || profile.name?.split(" ").slice(1).join(" ") || "";
      const displayName = profile.name || firstName;

      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: "user",
          emailVerified: Boolean(profile.email_verified ?? true),
          profile: {
            create: {
              firstName,
              lastName,
              displayName,
              avatarUrl: profile.picture || null,
              country: "US",
              region: "US",
              currency: "USD",
              locale: "en-US",
              timezone: "UTC",
            },
          },
          settings: {
            create: {
              theme: "system",
              emailNotifications: true,
              pushNotifications: true,
              reminderDaysBefore: 3,
              weeklyDigest: true,
              securityAlerts: true,
              onboardingCompleted: false,
              onboardingStep: 1,
            },
          },
          userSubscription: {
            create: {
              plan: "free",
              planName: "Free Starter",
              status: "active",
              billingInterval: "monthly",
              billingCycle: "monthly",
              amount: 0.0,
              currency: "USD",
              provider: "stripe",
            },
          },
        },
        include: {
          profile: true,
          userSubscription: true,
        },
      });

      console.log(`[Google OAuth] Created new customer account: ${user.email} (ID: ${user.id})`);
    } else {
      // Existing user: preserve role, update verification and avatar if unset
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          ...(user.profile && !user.profile.avatarUrl && profile.picture
            ? {
                profile: {
                  update: {
                    avatarUrl: profile.picture,
                  },
                },
              }
            : {}),
        },
      });

      if (!user.userSubscription) {
        await prisma.userSubscription.create({
          data: {
            userId: user.id,
            plan: "free",
            planName: "Free Starter",
            status: "active",
            billingInterval: "monthly",
            billingCycle: "monthly",
            amount: 0.0,
            currency: "USD",
            provider: "stripe",
          },
        });
      }
    }

    // 8. Create secure JWT session token for authenticated user ID
    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    // Asynchronously record central telemetry if central backend is configured
    try {
      const { isSupabaseServerAdminConfigured } = await import("@/lib/supabase/config");
      if (isSupabaseServerAdminConfigured()) {
        const { ensureCentralCustomerProfile, recordCentralLoginEvent } = await import("@/lib/supabase/server");
        const displayName =
          user.profile?.displayName ||
          `${user.profile?.firstName || ""} ${user.profile?.lastName || ""}`.trim() ||
          user.email.split("@")[0];
        Promise.allSettled([
          ensureCentralCustomerProfile({
            customerId: user.id,
            email: user.email,
            fullName: displayName,
          }),
          recordCentralLoginEvent({
            customerId: user.id,
            deviceId: isDesktop ? "desktop_google_oauth" : "web_browser_client",
            loginMethod: "google",
            os: "windows",
            appVersion: "1.0.0",
          }),
        ]).catch(() => {});
      }
    } catch {}

    // -------------------------------------------------------------
    // DESKTOP OAUTH FLOW HANDSHAKE (RFC 8252)
    // -------------------------------------------------------------
    if (isDesktop) {
      // Create single-use 30-second ticket indexed by state CSRF
      createDesktopAuthTicket(stateData.csrf, token);
      console.log("[Google OAuth] Desktop authentication ticket created for CSRF state.");
      return renderDesktopSuccessPage();
    }

    // -------------------------------------------------------------
    // STANDARD WEB OAUTH FLOW
    // -------------------------------------------------------------
    const isTargetingAdmin = stateData.returnTo.startsWith("/admin");
    const isOwner = isAuthorizedOwnerAdmin(user.email, user.role);

    let finalPath = stateData.returnTo || "/";

    if (isTargetingAdmin) {
      if (isOwner) {
        await setAdminSessionCookie(token);
        finalPath = "/admin";
      } else {
        finalPath = "/admin/login?error=forbidden";
      }
    } else {
      await setSessionCookie(token);
    }

    const redirectTarget = new URL(finalPath, url.origin);
    const response = NextResponse.redirect(redirectTarget);
    response.cookies.set("google_oauth_state", "", { maxAge: 0, path: "/" });
    return response;
  } catch (err: unknown) {
    console.error("[Google OAuth Callback] Error during callback execution:", err);
    return loginRedirect("error", "google_auth_failed");
  }
}
