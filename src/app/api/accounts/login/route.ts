import type { NextRequest } from "next/server";
import { handleLogin } from "@/api/accounts/login";

export async function POST(request: NextRequest) {
  return handleLogin(request);
}
