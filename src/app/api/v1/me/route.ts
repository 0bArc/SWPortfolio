import type { NextRequest } from "next/server";
import { handleV1Me } from "@/features/api/handlers/v1";

export async function GET(request: NextRequest) {
  return handleV1Me(request);
}
