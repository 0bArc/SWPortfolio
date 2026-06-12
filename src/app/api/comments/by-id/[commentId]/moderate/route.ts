import type { NextRequest } from "next/server";
import { handleModerateComment } from "@/features/blog/api/moderate-comment";

type Ctx = { params: Promise<{ commentId: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { commentId } = await params;
  return handleModerateComment(request, parseInt(commentId, 10));
}
