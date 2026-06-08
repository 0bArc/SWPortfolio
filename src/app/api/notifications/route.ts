import type { NextRequest } from "next/server";
import { handleGetNotifications, handlePatchNotifications } from "@/api/notifications";

export async function GET() {
  return handleGetNotifications();
}

export async function PATCH(request: NextRequest) {
  return handlePatchNotifications(request);
}
