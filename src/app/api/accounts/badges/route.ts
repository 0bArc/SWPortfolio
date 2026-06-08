import type { NextRequest } from "next/server";
import { handleGetBadgeGrants, handlePostBadgeGrant } from "@/api/accounts/badges";

export async function GET() {
  return handleGetBadgeGrants();
}

export async function POST(request: NextRequest) {
  return handlePostBadgeGrant(request);
}
