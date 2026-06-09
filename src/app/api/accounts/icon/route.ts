import type { NextRequest } from "next/server";
import { handleRemoveIcon, handleUploadIcon } from "@/features/accounts/api/icon";

export async function POST(request: NextRequest) {
  return handleUploadIcon(request);
}

export async function DELETE() {
  return handleRemoveIcon();
}
