import { handleLogout } from "@/api/accounts/logout";

export async function POST() {
  return handleLogout();
}
