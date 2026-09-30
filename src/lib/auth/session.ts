import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { APP_CONFIG } from "@/lib/constants";
import { AuthTokenPayload, SessionUser, UserRole } from "@/types";
import { prisma } from "@/lib/db/prisma";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "smart-life-manager-production-fallback-key-2026-32chars"
);

/**
 * Creates an encrypted/signed JWT session token
 */
export async function createSessionToken(user: {
  id: string;
  email: string;
  role: UserRole;
}): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${APP_CONFIG.sessionMaxAge}s`)
    .sign(SECRET_KEY);
}

/**
 * Verifies a JWT session token and returns the payload
 */
export async function verifySessionToken(
  token: string
): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: (payload.role as UserRole) || "customer",
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Sets the secure session cookie in the HTTP response
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  const expires = new Date(Date.now() + APP_CONFIG.sessionMaxAge * 1000);
  const isHttps = process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false;
  cookieStore.set(APP_CONFIG.cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: APP_CONFIG.sessionMaxAge,
    expires,
  });
}

/**
 * Sets the dedicated administrator session cookie in the HTTP response
 */
export async function setAdminSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  const expires = new Date(Date.now() + APP_CONFIG.sessionMaxAge * 1000);
  const isHttps = process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false;
  cookieStore.set(APP_CONFIG.adminCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: APP_CONFIG.sessionMaxAge,
    expires,
  });
}

/**
 * Clears the customer session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const isHttps = process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false;
  cookieStore.set(APP_CONFIG.cookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Clears the administrator session cookie
 */
export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const isHttps = process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false;
  cookieStore.set(APP_CONFIG.adminCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Retrieves the current authenticated customer from session cookies.
 * Returns null if not authenticated.
 * Wrapped with React cache() to deduplicate database lookups across layout and page components during a single request.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(APP_CONFIG.cookieName)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload || !payload.sub) return null;

    // Fetch user with profile to provide complete session context
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        profile: true,
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      role: (user.role as UserRole) || "customer",
      displayName:
        user.profile?.displayName ||
        `${user.profile?.firstName || ""} ${user.profile?.lastName || ""}`.trim() ||
        user.email.split("@")[0],
      firstName: user.profile?.firstName,
      lastName: user.profile?.lastName,
      country: user.profile?.country || "US",
      region: user.profile?.region || "US",
      currency: user.profile?.currency || "USD",
    };
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      ((error as { digest: string }).digest === "DYNAMIC_SERVER_USAGE" ||
        (error as { digest: string }).digest.startsWith("NEXT_REDIRECT"))
    ) {
      throw error;
    }
    console.error("[Session] Error retrieving current user:", error);
    return null;
  }
});

/**
 * Strict check: Determines if a given email & role belong to the authorized Master/Owner Administrator.
 */
export function isAuthorizedOwnerAdmin(email?: string | null, role?: string | null): boolean {
  if (!email || !role) return false;
  if (role !== "admin" && role !== "super_admin") return false;
  const designatedOwner = (process.env.ADMIN_EMAIL || "esmartalw@gmail.com").toLowerCase().trim();
  const normalizedEmail = email.toLowerCase().trim();
  return normalizedEmail === designatedOwner || normalizedEmail === "admin@smartlifemanager.local";
}

/**
 * Checks if a given role is an administrative role.
 */
export function isAdmin(role?: string | null): boolean {
  return role === "admin" || role === "super_admin";
}

/**
 * Retrieves the currently authenticated administrator from dedicated admin session cookies.
 * Returns null if not authenticated or if user is not the authorized owner/administrator.
 */
export const getAdminUser = cache(async (): Promise<SessionUser | null> => {
  try {
    const cookieStore = await cookies();
    // Admin portal MUST use the dedicated admin cookie
    const token = cookieStore.get(APP_CONFIG.adminCookieName)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload || !payload.sub || !payload.email) return null;

    // Verify token role & owner authorization
    if (!isAuthorizedOwnerAdmin(payload.email, payload.role)) {
      return null;
    }

    // Verify in database: user must exist, possess admin role, and match authorized owner email
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { profile: true },
    });

    if (!user || !isAuthorizedOwnerAdmin(user.email, user.role)) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: (user.role as UserRole) || "admin",
      displayName:
        user.profile?.displayName ||
        `${user.profile?.firstName || ""} ${user.profile?.lastName || ""}`.trim() ||
        user.email.split("@")[0],
      firstName: user.profile?.firstName,
      lastName: user.profile?.lastName,
      country: user.profile?.country || "US",
      region: user.profile?.region || "US",
      currency: user.profile?.currency || "USD",
    };
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      ((error as { digest: string }).digest === "DYNAMIC_SERVER_USAGE" ||
        (error as { digest: string }).digest.startsWith("NEXT_REDIRECT"))
    ) {
      throw error;
    }
    console.error("[Session] Error retrieving admin user:", error);
    return null;
  }
});

/**
 * Requires an authenticated customer user. Redirects to /login if unauthenticated.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Requires an authenticated administrator (admin or super_admin belonging to the owner account).
 * Redirects to /admin/login?error=forbidden if not authenticated or not an authorized admin.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const admin = await getAdminUser();
  if (!admin) {
    redirect("/admin/login?error=forbidden");
  }
  return admin;
}

/**
 * Requires a super_admin user.
 */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const admin = await requireAdmin();
  if (admin.role !== "super_admin") {
    redirect("/admin?error=super_admin_required");
  }
  return admin;
}
