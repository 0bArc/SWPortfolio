import type { NextRequest } from "next/server";
import { handlePostSuppress } from "@/features/notifications/api";

export async function POST(request: NextRequest) {
  return handlePostSuppress(request);
}
