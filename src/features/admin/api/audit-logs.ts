import type { NextRequest } from "next/server";
import { listAuditLogs } from "@/database/audit-logs";
import type { AuditCategory } from "@/features/events/types";
import { jsonError } from "@/lib/network/http";

const CATEGORIES: AuditCategory[] = [
  "user",
  "badge",
  "role",
  "media",
  "blog",
  "api_key",
  "account",
  "content",
  "admin",
];

export async function handleListAuditLogs(request: NextRequest): Promise<Response> {
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const category = sp.get("category") as AuditCategory | null;
  const eventType = sp.get("eventType")?.trim() || undefined;

  if (category && !CATEGORIES.includes(category)) {
    return jsonError("Invalid category", 400);
  }

  const result = await listAuditLogs(page, { category: category ?? undefined, eventType });
  return Response.json({
    items: result.items,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    pageCount: Math.max(1, Math.ceil(result.total / result.pageSize)),
    categories: CATEGORIES,
  });
}
