import { type NextRequest } from "next/server";
import { requireAdminCms } from "@/features/admin/services/auth";
import { handleDeleteTag, handleGetTag, handleUpdateTag } from "@/features/admin/api/tags";

interface RouteCtx {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdminCms();
  if (denied) return denied;

  const { slug } = await params;
  return handleGetTag(slug);
}

export async function PUT(request: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdminCms();
  if (denied) return denied;

  const { slug } = await params;
  return handleUpdateTag(slug, request);
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdminCms();
  if (denied) return denied;

  const { slug } = await params;
  return handleDeleteTag(slug);
}
