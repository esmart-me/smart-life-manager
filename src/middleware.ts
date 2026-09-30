import { NextResponse, type NextRequest } from "next/server";
import { APP_CONFIG } from "@/lib/constants";

// Protected app paths
const PROTECTED_PREFIXES = [
  "/documents",
  "/reminders",
  "/finance",
  "/vehicles",
  "/subscriptions",
  "/dates",
  "/family",
  "/reports",
  "/search",
  "/pricing",
  "/premium",
  "/more",
  "/settings",
  "/profile",
];

// Public auth paths (redirect to dashboard if already logged in)
const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

function getPayloadFromSessionToken(token?: string): { role: string | null; email: string | null } {
  if (!token) return { role: null, email: null };
  try {
    const parts = token.split(".");
    if (parts.length < 2) return { role: null, email: null };
    const jsonStr = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(jsonStr);
    return { role: payload.role || null, email: payload.email || null };
  } catch {
    return { role: null, email: null };
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(APP_CONFIG.cookieName)?.value;
  const adminSessionCookie = request.cookies.get(APP_CONFIG.adminCookieName)?.value;

  const isExactRoot = pathname === "/";
  const isProtected = isExactRoot || PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminApiRoute =
    pathname.startsWith("/api/admin") &&
    !pathname.startsWith("/api/admin/auth/login") &&
    !pathname.startsWith("/api/admin/auth/forgot-password") &&
    !pathname.startsWith("/api/admin/auth/reset-password");

  // 1. API Admin Protection: Reject unauthorized calls immediately with JSON
  if (isAdminApiRoute) {
    if (!adminSessionCookie) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Administrator authentication required." } },
        { status: 401 }
      );
    }
    const { role, email } = getPayloadFromSessionToken(adminSessionCookie);
    const ownerEmail = (process.env.ADMIN_EMAIL || "esmartalw@gmail.com").toLowerCase().trim();
    const normalizedEmail = (email || "").toLowerCase().trim();
    const isOwner = normalizedEmail === ownerEmail || normalizedEmail === "admin@smartlifemanager.local";

    if ((role !== "admin" && role !== "super_admin") || !isOwner) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Administrator access denied. Master Administrator privileges required." } },
        { status: 403 }
      );
    }
  }

  // 2. Admin Portal Route Protection: Require dedicated admin session & owner validation
  if (isAdminRoute) {
    if (!adminSessionCookie) {
      const adminLoginUrl = new URL("/admin/login", request.url);
      adminLoginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(adminLoginUrl);
    }
    const { role, email } = getPayloadFromSessionToken(adminSessionCookie);
    const ownerEmail = (process.env.ADMIN_EMAIL || "esmartalw@gmail.com").toLowerCase().trim();
    const normalizedEmail = (email || "").toLowerCase().trim();
    const isOwner = normalizedEmail === ownerEmail || normalizedEmail === "admin@smartlifemanager.local";

    if ((role !== "admin" && role !== "super_admin") || !isOwner) {
      return NextResponse.redirect(new URL("/admin/login?error=forbidden", request.url));
    }
  }

  // 3. Customer Protected Route: Require customer session
  if (isProtected && !sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Customer Auth Route: If logged in with customer session, redirect to customer dashboard
  if (isAuthRoute && sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths including api/admin, except:
     * - non-admin api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, fonts
     */
    "/((?!api/(?!admin)|_next/static|_next/image|favicon.ico).*)",
  ],
};
