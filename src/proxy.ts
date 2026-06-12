import { NextResponse, type NextRequest } from "next/server";
import { adminConfig } from "@api-config";
import { verifyToken, COOKIE_NAME } from "@/features/admin/services/auth";
import { clientIp } from "@/lib/network/server/security";
import { logSecurityEvent } from "@/lib/security/audit";
import { isBlockedProbePath } from "@/lib/security/probe-block";

function securityHeaders(res: NextResponse, isDev: boolean, isApi: boolean) {
  if (!isApi) {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      isDev
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com"
        : "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
      "frame-src https://challenges.cloudflare.com",
      "connect-src 'self' https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: https://avatars.githubusercontent.com https://github.com",
      "font-src 'self'",
    ].join("; ");
    res.headers.set("Content-Security-Policy", csp);
  }

  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  );
  if (!isDev) {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  res.headers.delete("X-Powered-By");
  return res;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDev = process.env.NODE_ENV === "development";
  const isApi = pathname.startsWith("/api/");

  if (isBlockedProbePath(pathname)) {
    void logSecurityEvent({
      type: "probe_blocked",
      ip: clientIp(request),
      meta: { path: pathname },
    });
    const res = NextResponse.json({ error: "Not found" }, { status: 404 });
    return securityHeaders(res, isDev, true);
  }

  const isAdminRoute =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isAuthExempt =
    pathname === "/admin/login" ||
    pathname.startsWith("/api/admin/login") ||
    pathname.startsWith("/api/admin/logout");

  if (isAdminRoute && !isAuthExempt) {
    const sessionCookie = request.cookies.get(COOKIE_NAME);
    const secret = adminConfig.sessionSecret;
    const valid =
      secret && sessionCookie
        ? await verifyToken(sessionCookie.value, secret)
        : false;
    if (!valid) {
      if (pathname.startsWith("/api/admin")) {
        const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        return securityHeaders(res, isDev, true);
      }
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  const res = NextResponse.next();
  return securityHeaders(res, isDev, isApi);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
