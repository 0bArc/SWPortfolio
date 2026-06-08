import type { NextRequest } from "next/server";
import { handlePostSuppress } from "@/api/notifications";

export async function POST(request: NextRequest) {
  return handlePostSuppress(request);
}
