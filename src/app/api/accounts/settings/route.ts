import type { NextRequest } from "next/server";
import {
  handleDeleteAccount,
  handleGetSettings,
  handlePatchSettings,
} from "@/api/accounts/settings";

export async function GET() {
  return handleGetSettings();
}

export async function PATCH(request: NextRequest) {
  return handlePatchSettings(request);
}

export async function DELETE(request: NextRequest) {
  return handleDeleteAccount(request);
}
