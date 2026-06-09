import type { NextRequest } from "next/server";
import { handleSignup } from "@/features/accounts/api/signup";

export async function POST(request: NextRequest) {
  return handleSignup(request);
}
