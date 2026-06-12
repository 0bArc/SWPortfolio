import { requireAdmin } from "@/features/admin/services/auth";
import { listPostAuthorCandidates } from "@/features/blog/services/post-authors";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const authors = await listPostAuthorCandidates();
    return Response.json(authors);
  } catch (err) {
    console.error("listPostAuthorCandidates error:", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}
