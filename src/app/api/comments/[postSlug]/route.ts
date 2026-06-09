import type { NextRequest } from "next/server";
import { handleGetComments, handlePostComment } from "@/features/blog/api/comments";

type Props = { params: Promise<{ postSlug: string }> };

export async function GET(_req: NextRequest, { params }: Props) {
  const { postSlug } = await params;
  return handleGetComments(postSlug);
}

export async function POST(request: NextRequest, { params }: Props) {
  const { postSlug } = await params;
  return handlePostComment(request, postSlug);
}
