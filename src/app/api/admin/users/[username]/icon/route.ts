import type { NextRequest } from "next/server";
import { requireAdmin } from "@/features/admin/services/auth";
import { handleReviewIcon } from "@/features/admin/api/icon-review";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { username } = await params;
  return handleReviewIcon(request, username);
}
