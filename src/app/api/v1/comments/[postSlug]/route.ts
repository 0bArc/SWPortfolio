import type { NextRequest } from "next/server";
import { handleV1Comments } from "@/features/api/handlers/v1";

type Ctx = { params: Promise<{ postSlug: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { postSlug } = await params;
  return handleV1Comments(request, postSlug);
}
