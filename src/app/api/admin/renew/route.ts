import { NextResponse } from "next/server";
import { requireAdmin, signToken, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/admin/auth";

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const token = await signToken(secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}
