import type { NextRequest } from "next/server";
import { handleGetNotifications, handlePatchNotifications } from "@/features/notifications/api";

export async function GET() {
  return handleGetNotifications();
}

export async function PATCH(request: NextRequest) {
  return handlePatchNotifications(request);
}
