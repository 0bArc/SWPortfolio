import type { NextRequest } from "next/server";
import { handleVerifyEmail } from "@/features/accounts/api/verify-email";

export async function GET(request: NextRequest) {
  return handleVerifyEmail(request);
}
