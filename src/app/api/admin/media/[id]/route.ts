import type { NextRequest } from "next/server";
import { requireAdmin } from "@/features/admin/services/auth";
import { handleMediaAction } from "@/features/admin/api/media";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  return handleMediaAction(request, id);
}

export async function DELETE(request: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  return handleMediaAction(request, id);
}
