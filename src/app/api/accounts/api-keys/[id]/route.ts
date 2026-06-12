import type { NextRequest } from "next/server";
import { handleRevokeApiKey } from "@/features/accounts/api/api-keys";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const keyId = Number.parseInt(id, 10);
  if (!Number.isInteger(keyId) || keyId <= 0) {
    return Response.json({ error: "Invalid key id" }, { status: 400 });
  }
  return handleRevokeApiKey(request, keyId);
}
