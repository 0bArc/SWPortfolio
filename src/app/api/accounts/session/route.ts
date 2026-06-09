import { handleSession } from "@/features/accounts/api/session";

export async function GET() {
  return handleSession();
}
