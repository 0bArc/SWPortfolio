import { handleAuthorListAuthors } from "@/features/blog/api/author-posts";

export async function GET() {
  return handleAuthorListAuthors();
}
