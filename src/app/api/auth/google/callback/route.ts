// src/app/api/auth/google/callback/route.ts
// Secure Google OAuth 2.0 callback handler with CSRF verification, customer linking, and dashboard redirection

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import {
  isGoogleOAuthConfigured,
  exchangeGoogleCodeForTokens,
  getGoogleUserProfile,
  parseAndValidateOAuthState,
} from "@/lib/auth/google-oauth";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");

  const loginRedirect = async (paramKey: string, paramValue: string) => {
    const dest = new URL("/login", url.origin);
    dest.searchParams.set(paramKey, paramValue);
    const res = NextResponse.redirect(dest);
    // Clear CSRF state cookie
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

  // 3. Verify server configuration
  if (!isGoogleOAuthConfigured()) {
    return loginRedirect("error", "google_not_configured");
  }

  // 4. Validate CSRF state token
  const cookieStore = await cookies();
  const expectedCsrf = cookieStore.get("google_oauth_state")?.value;
  const { valid: isStateValid, returnTo } = parseAndValidateOAuthState(state, expectedCsrf);

  if (!isStateValid) {
    console.warn("[Google OAuth Callback] State validation failed (possible CSRF attempt or expired state)");
    return loginRedirect("error", "google_invalid_state");
  }

  try {
    // 5. Exchange code for access token
    const tokenData = await exchangeGoogleCodeForTokens(code, request);
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
          role: "user", // Normal customer account
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
      // Existing user: preserve user ID and role, mark email verified, update avatar if unset
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

      // Ensure user subscription exists
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

    // 9. Set session cookie
    await setSessionCookie(token);

    // 10. Safe redirect: Normal customers must NEVER be redirected to the Admin Portal
    let finalPath = returnTo;
    if (finalPath.startsWith("/admin") && user.role !== "admin" && user.role !== "super_admin") {
      finalPath = "/";
    }

    const redirectTarget = new URL(finalPath || "/", url.origin);
    const response = NextResponse.redirect(redirectTarget);
    // Clear CSRF state cookie
    response.cookies.set("google_oauth_state", "", { maxAge: 0, path: "/" });
    return response;
  } catch (err: unknown) {
    console.error("[Google OAuth Callback] Error during callback execution:", err);
    return loginRedirect("error", "google_auth_failed");
  }
}
