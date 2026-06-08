import { handleSession } from "@/api/accounts/session";

export async function GET() {
  return handleSession();
}
