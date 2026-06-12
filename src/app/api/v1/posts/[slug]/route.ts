import type { NextRequest } from "next/server";
import { handleV1Post } from "@/features/api/handlers/v1";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  return handleV1Post(request, slug);
}
