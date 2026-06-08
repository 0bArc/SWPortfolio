import { handleGetPermissions } from "@/api/accounts/permissions";

export async function GET() {
  return handleGetPermissions();
}
