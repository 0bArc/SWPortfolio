import type { NextRequest } from "next/server";
import { handleLogin } from "@/features/accounts/api/login";

export async function POST(request: NextRequest) {
  return handleLogin(request);
}
