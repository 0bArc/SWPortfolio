import { handleLogout } from "@/features/accounts/api/logout";

export async function POST() {
  return handleLogout();
}
