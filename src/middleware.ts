import { NextResponse, type NextRequest } from "next/server";
import { APP_CONFIG } from "@/lib/constants";

// Protected app paths
const PROTECTED_PREFIXES = [
  "/documents",
  "/reminders",
  "/finance",
  "/more",
  "/settings",
  "/profile",
];

// Public auth paths (redirect to dashboard if already logged in)
const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

function getRoleFromSessionToken(token?: string): string | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const jsonStr = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(jsonStr);
    return payload.role || null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(APP_CONFIG.cookieName)?.value;

  const isExactRoot = pathname === "/";
  const isProtected = isExactRoot || PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/login";

  // 1. If trying to access admin portal: require session and admin role
  if (isAdminRoute) {
    if (!sessionCookie) {
      const adminLoginUrl = new URL("/admin/login", request.url);
      adminLoginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(adminLoginUrl);
    }
    const role = getRoleFromSessionToken(sessionCookie);
    if (role !== "admin" && role !== "super_admin") {
      return NextResponse.redirect(new URL("/admin/login?error=forbidden", request.url));
    }
  }

  // 2. If trying to access protected customer route without session -> immediate HTTP 307 redirect to /login
  if (isProtected && !sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. If logged in and trying to visit login/register -> redirect to dashboard
  if (isAuthRoute && sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled individually)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, fonts
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
