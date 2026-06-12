import type { NextRequest } from "next/server";
import { handleListAuditLogs } from "@/features/admin/api/audit-logs";
import { requireAdmin } from "@/features/admin/services/auth";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  return handleListAuditLogs(request);
}
