import type { NextRequest } from "next/server";
import {
  getMediaAssetById,
  listMediaAssets,
  MEDIA_PAGE_SIZE,
  type MediaKind,
  type MediaStatus,
} from "@/database/media";
import { getAccountSessionId } from "@/features/accounts/services/auth/session";
import {
  approveMediaId,
  deleteMediaAsset,
  rejectMediaId,
} from "@/features/media/services/assets";
import { jsonError } from "@/lib/network/http";

const UUID_RE = /^[a-f0-9-]{36}$/i;

export async function handleListMedia(request: NextRequest): Promise<Response> {
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const kind = sp.get("kind") as MediaKind | null;
  const status = sp.get("status") as MediaStatus | null;
  const accountIdRaw = sp.get("accountId");
  const accountId = accountIdRaw ? parseInt(accountIdRaw, 10) : undefined;

  if (kind && kind !== "avatar" && kind !== "blog") {
    return jsonError("Invalid kind", 400);
  }
  if (status && !["pending", "approved", "rejected", "superseded"].includes(status)) {
    return jsonError("Invalid status", 400);
  }

  const { items, total } = await listMediaAssets(page, {
    kind: kind ?? undefined,
    status: status ?? undefined,
    accountId: Number.isFinite(accountId) ? accountId : undefined,
  });

  return Response.json({
    items,
    total,
    page,
    pageSize: MEDIA_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / MEDIA_PAGE_SIZE)),
  });
}

export async function handleMediaAction(
  request: NextRequest,
  id: string
): Promise<Response> {
  if (!UUID_RE.test(id)) return jsonError("Invalid id", 400);

  const asset = await getMediaAssetById(id);
  if (!asset) return jsonError("Not found", 404);

  if (request.method === "DELETE") {
    const ok = await deleteMediaAsset(id);
    if (!ok) return jsonError("Not found", 404);
    return Response.json({ ok: true, action: "delete" });
  }

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const action = body.action?.trim().toLowerCase();
  if (action !== "approve" && action !== "reject" && action !== "delete") {
    return jsonError("action must be approve, reject, or delete", 400);
  }

  const adminId = await getAccountSessionId();

  if (action === "approve") {
    try {
      await approveMediaId(id, adminId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Approve failed";
      return jsonError(msg, 400);
    }
  } else if (action === "reject") {
    await rejectMediaId(id);
  } else {
    const ok = await deleteMediaAsset(id);
    if (!ok) return jsonError("Not found", 404);
  }

  return Response.json({ ok: true, action });
}
