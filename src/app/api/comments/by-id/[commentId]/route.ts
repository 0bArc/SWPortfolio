import type { NextRequest } from "next/server";
import { handleDeleteComment } from "@/api/comments/delete";

interface Props {
  params: Promise<{ commentId: string }>;
}

export async function DELETE(request: NextRequest, { params }: Props) {
  const { commentId } = await params;
  return handleDeleteComment(request, Number(commentId));
}
