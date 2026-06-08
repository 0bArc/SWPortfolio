import type { NextRequest } from "next/server";
import { handleSignup } from "@/api/accounts/signup";

export async function POST(request: NextRequest) {
  return handleSignup(request);
}
