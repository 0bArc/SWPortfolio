import type { NextRequest } from "next/server";
import { requireAdminCms } from "@/features/admin/services/auth";
import { handleListMedia } from "@/features/admin/api/media";

export async function GET(request: NextRequest) {
  const denied = await requireAdminCms();
  if (denied) return denied;
  return handleListMedia(request);
}
