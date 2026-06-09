import { handleGetPermissions } from "@/features/accounts/api/permissions";

export async function GET() {
  return handleGetPermissions();
}
