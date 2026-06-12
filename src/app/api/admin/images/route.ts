import { type NextRequest } from "next/server";
import { requireAdminCms } from "@/features/admin/services/auth";
import { getAccountSessionId } from "@/features/accounts/services/auth/session";
import { saveTrackedImage } from "@/features/media/services/assets";
import { jsonError } from "@/lib/network/http";

export async function POST(request: NextRequest) {
  const denied = await requireAdminCms();
  if (denied) return denied;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("Missing file", 400);
  }

  const mime = file.type || "application/octet-stream";
  const buf = Buffer.from(await file.arrayBuffer());
  const accountId = await getAccountSessionId();

  try {
    const { id, url } = await saveTrackedImage({
      data: buf,
      mime,
      kind: "blog",
      status: "approved",
      uploadedByAccountId: accountId,
      approvedByAccountId: accountId,
    });
    return Response.json({ id, url }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return jsonError(msg, 400);
  }
}
