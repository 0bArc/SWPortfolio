import type { NextRequest } from "next/server";
import { requireAdminUsers } from "@/features/admin/services/auth";
import { handleListPendingIcons } from "@/features/admin/api/icon-review";

export async function GET(request: NextRequest) {
  const denied = await requireAdminUsers();
  if (denied) return denied;
  return handleListPendingIcons(request);
}
