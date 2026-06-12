import type { NextRequest } from "next/server";
import { requireAdminCms } from "@/features/admin/services/auth";
import { handleMediaAction } from "@/features/admin/api/media";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdminCms();
  if (denied) return denied;
  const { id } = await params;
  return handleMediaAction(request, id);
}

export async function DELETE(request: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdminCms();
  if (denied) return denied;
  const { id } = await params;
  return handleMediaAction(request, id);
}
