import type { NextRequest } from "next/server";
import { handleGetBadgeGrants, handlePostBadgeGrant } from "@/features/accounts/api/badges";

export async function GET() {
  return handleGetBadgeGrants();
}

export async function POST(request: NextRequest) {
  return handlePostBadgeGrant(request);
}
