import type { NextRequest } from "next/server";
import { handleV1Posts } from "@/features/api/handlers/v1";

export async function GET(request: NextRequest) {
  return handleV1Posts(request);
}
