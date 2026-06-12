import { type NextRequest } from "next/server";
import { requireAdminCms } from "@/features/admin/services/auth";
import { handleCreateTag, handleListTags } from "@/features/admin/api/tags";

export async function GET() {
  const denied = await requireAdminCms();
  if (denied) return denied;
  return handleListTags();
}

export async function POST(request: NextRequest) {
  const denied = await requireAdminCms();
  if (denied) return denied;
  return handleCreateTag(request);
}
