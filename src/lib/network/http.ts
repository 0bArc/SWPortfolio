import type { NextRequest } from "next/server";
import type { AccountBanView } from "@/database/schema";

export function getClientIp(request: NextRequest | Request): string | null {
  const req = request as NextRequest;
  const forwarded = req.headers?.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return req.headers?.get("x-real-ip") ?? null;
}

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export function jsonSuspended(ban: AccountBanView): Response {
  return Response.json({ error: "Account suspended", suspended: true, ban }, { status: 403 });
}
