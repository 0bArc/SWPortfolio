import type { NextRequest } from "next/server";
import {
  handleAuthorCreatePost,
  handleAuthorListPosts,
} from "@/features/blog/api/author-posts";

export async function GET() {
  return handleAuthorListPosts();
}

export async function POST(request: NextRequest) {
  return handleAuthorCreatePost(request);
}
