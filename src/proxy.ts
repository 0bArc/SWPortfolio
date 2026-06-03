import { NextResponse, type NextRequest } from "next/server";

const BLOCKED = [
  /\.php($|\?)/i,
  /\.asp(x?)($|\?)/i,
  /\.env($|\/)/i,
  /\/\.git(\/|$)/,
  /\/\.svn(\/|$)/,
  /\/wp-(admin|login|content|includes)/i,
  /\/wordpress/i,
  /\/phpmyadmin/i,
  /\/(xmlrpc|cgi-bin|shell|eval)/i,
  /\/(backup|dump|database)\./i,
  /\/etc\/passwd/i,
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (BLOCKED.some((p) => p.test(pathname))) {
    return new NextResponse(null, { status: 404 });
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    isDev
      ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`
      : `script-src 'self' 'nonce-${nonce}'`,
    "connect-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://avatars.githubusercontent.com",
    "font-src 'self'",
  ].join("; ");

  const reqHeaders = new Headers(request.headers);
  reqHeaders.set("x-nonce", nonce);

  const res = NextResponse.next({ request: { headers: reqHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (!isDev) {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  res.headers.delete("X-Powered-By");

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
