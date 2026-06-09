import { requireAdmin } from "@/features/admin/services/auth";
import { handleListUnverifiedUsers } from "@/features/admin/api/moderation";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return handleListUnverifiedUsers();
}
