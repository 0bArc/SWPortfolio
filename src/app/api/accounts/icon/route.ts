import type { NextRequest } from "next/server";
import { handleRemoveIcon, handleUploadIcon } from "@/api/accounts/icon";

export async function POST(request: NextRequest) {
  return handleUploadIcon(request);
}

export async function DELETE() {
  return handleRemoveIcon();
}
