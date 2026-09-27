// src/app/api/auth/google/callback/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import {
  isGoogleOAuthConfigured,
  exchangeGoogleCodeForTokens,
  getGoogleUserProfile,
} from "@/lib/auth/google-oauth";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");

  const loginRedirect = (paramKey: string, paramValue: string) => {
    const dest = new URL("/login", url.origin);
    dest.searchParams.set(paramKey, paramValue);
    return NextResponse.redirect(dest);
  };

  if (error) {
    console.error("[Google OAuth Callback] Error reported by Google:", error);
    return loginRedirect("error", `google_${error}`);
  }

  if (!code) {
    return loginRedirect("error", "missing_code");
  }

  if (!isGoogleOAuthConfigured()) {
    return loginRedirect("error", "google_not_configured");
  }

  try {
    // 1. Exchange code for access token
    const tokenData = await exchangeGoogleCodeForTokens(code);
    if (!tokenData.access_token) {
      throw new Error("No access_token returned by Google");
    }

    // 2. Fetch user profile from Google
    const profile = await getGoogleUserProfile(tokenData.access_token);
    if (!profile.email) {
      throw new Error("Google profile did not contain a valid email address");
    }

    const normalizedEmail = profile.email.trim().toLowerCase();

    // 3. Find or create user in SQLite database
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        profile: true,
        userSubscription: true,
      },
    });

    if (!user) {
      // Create new customer account authenticated via Google
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      const firstName = profile.given_name || profile.name?.split(" ")[0] || "Customer";
      const lastName =
        profile.family_name || profile.name?.split(" ").slice(1).join(" ") || "";
      const displayName = profile.name || firstName;

      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: "user",
          emailVerified: true,
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
      // Existing user: mark email verified and update avatar if missing
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

    // 4. Create secure JWT session token
    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    // 5. Set session cookie
    await setSessionCookie(token);

    // 6. Redirect to dashboard or valid return path
    let targetPath = "/";
    if (state && state.startsWith("/") && !state.startsWith("//")) {
      targetPath = state;
    }

    const redirectTarget = new URL(targetPath, url.origin);
    return NextResponse.redirect(redirectTarget);
  } catch (err: unknown) {
    console.error("[Google OAuth Callback] Error during callback execution:", err);
    return loginRedirect(
      "error",
      "google_auth_failed"
    );
  }
}
