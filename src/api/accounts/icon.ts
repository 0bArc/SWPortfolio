import type { NextRequest } from "next/server";
import { requireAccount } from "@/lib/accounts/auth";
import { saveBlogImage } from "@/lib/blog/images";
import { updateAccountIcon } from "@/lib/db/accounts";
import { assertSameOrigin, rateLimit } from "@/api/lib/security";
import { jsonError } from "@/api/lib/http";

export async function handleUploadIcon(request: NextRequest): Promise<Response> {
  const blocked = assertSameOrigin(request) ?? rateLimit(request, "icon-upload", 10, 60 * 60 * 1000);
  if (blocked) return blocked;

  const auth = await requireAccount();
  if (auth instanceof Response) return auth;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("Missing file", 400);
  }

  const mime = file.type || "application/octet-stream";
  const buf = Buffer.from(await file.arrayBuffer());

  try {
    const { url } = await saveBlogImage(buf, mime);
    await updateAccountIcon(auth.accountId, url);
    return Response.json({
      icon: url,
      account: { ...auth.account, icon: url },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return jsonError(msg, 400);
  }
}

export async function handleRemoveIcon(): Promise<Response> {
  const auth = await requireAccount();
  if (auth instanceof Response) return auth;

  await updateAccountIcon(auth.accountId, null);
  return Response.json({
    icon: null,
    account: { ...auth.account, icon: null },
  });
}
