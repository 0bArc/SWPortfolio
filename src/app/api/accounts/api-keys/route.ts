import type { NextRequest } from "next/server";
import { handleCreateApiKey, handleListApiKeys } from "@/features/accounts/api/api-keys";

export async function GET() {
  return handleListApiKeys();
}

export async function POST(request: NextRequest) {
  return handleCreateApiKey(request);
}
