import { requireAdminUsers } from "@/features/admin/services/auth";
import { handleListUnverifiedUsers } from "@/features/admin/api/moderation";

export async function GET() {
  const denied = await requireAdminUsers();
  if (denied) return denied;
  return handleListUnverifiedUsers();
}
