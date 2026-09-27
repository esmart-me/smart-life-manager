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
  cookieStore.set(APP_CONFIG.cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: APP_CONFIG.sessionMaxAge,
    expires,
  });
}

/**
 * Clears the session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(APP_CONFIG.cookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Retrieves the current authenticated user from session cookies.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
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
}

/**
 * Checks if a given role is an administrative role.
 */
export function isAdmin(role?: string | null): boolean {
  return role === "admin" || role === "super_admin";
}

/**
 * Requires an authenticated user. Redirects to /login if unauthenticated.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Requires an authenticated administrator (admin or super_admin).
 * Redirects to /admin/login if not authenticated or not an admin.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }
  if (!isAdmin(user.role)) {
    // If authenticated as a customer, redirect to forbidden or /admin/login?error=unauthorized
    redirect("/admin/login?error=forbidden");
  }
  return user;
}

/**
 * Requires a super_admin user.
 */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireAdmin();
  if (user.role !== "super_admin") {
    redirect("/admin?error=super_admin_required");
  }
  return user;
}
