import type { NextRequest } from "next/server";
import { requireAuthorPost } from "@/features/blog/services/author-guard";
import { saveTrackedImage } from "@/features/media/services/assets";
import { jsonError } from "@/lib/network/http";

export async function POST(request: NextRequest) {
  const actor = await requireAuthorPost();
  if (actor instanceof Response) return actor;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("Missing file", 400);
  }

  const mime = file.type || "application/octet-stream";
  const buf = Buffer.from(await file.arrayBuffer());

  try {
    const { id, url } = await saveTrackedImage({
      data: buf,
      mime,
      kind: "blog",
      status: "approved",
      accountId: actor.accountId,
      uploadedByAccountId: actor.accountId,
      approvedByAccountId: actor.accountId,
    });
    return Response.json({ id, url }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return jsonError(msg, 400);
  }
}
