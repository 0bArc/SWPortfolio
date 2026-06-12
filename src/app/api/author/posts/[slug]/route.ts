import type { NextRequest } from "next/server";
import {
  handleAuthorDeletePost,
  handleAuthorGetPost,
  handleAuthorUpdatePost,
} from "@/features/blog/api/author-posts";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { slug } = await params;
  return handleAuthorGetPost(slug);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { slug } = await params;
  return handleAuthorUpdatePost(request, slug);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { slug } = await params;
  return handleAuthorDeletePost(slug);
}
