import { type NextRequest } from "next/server";
import { requireAdmin } from "@/features/admin/services/auth";
import { saveBlogImage } from "@/features/blog/services/images";

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }

  const mime = file.type || "application/octet-stream";
  const buf = Buffer.from(await file.arrayBuffer());

  try {
    const { id, url } = await saveBlogImage(buf, mime);
    return Response.json({ id, url }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return Response.json({ error: msg }, { status: 400 });
  }
}
