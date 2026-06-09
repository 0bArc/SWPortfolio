import type { NextRequest } from "next/server";
import { handleResendVerification } from "@/features/accounts/api/resend-verification";

export async function POST(request: NextRequest) {
  return handleResendVerification(request);
}
