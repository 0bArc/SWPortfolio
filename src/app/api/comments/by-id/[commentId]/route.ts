import type { NextRequest } from "next/server";
import { handleDeleteComment } from "@/features/blog/api/delete-comment";

interface Props {
  params: Promise<{ commentId: string }>;
}

export async function DELETE(request: NextRequest, { params }: Props) {
  const { commentId } = await params;
  return handleDeleteComment(request, Number(commentId));
}
