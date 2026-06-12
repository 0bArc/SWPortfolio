import type { NextRequest } from "next/server";
import { requireVerifiedAccount } from "@/features/accounts/services/auth/session";
import {
  hasPermission,
  resolvePermissions,
} from "@/features/accounts/services/permissions/resolve";
import {
  idsFromIconUrls,
  purgeMediaIds,
  replaceAccountAvatars,
  saveTrackedImage,
} from "@/features/media/services/assets";
import { deleteMediaAssetRow } from "@/database/media";
import { loadBlogImage } from "@/features/blog/services/images";
import {
  clearAccountIcons,
  getAccountSessionById,
  submitAccountIconPending,
  updateAccountIcon,
} from "@/database/accounts";
import { dispatchSiteEvent } from "@/features/events";
import { assertSameOrigin, rateLimit } from "@/lib/network/server/security";
import { jsonError } from "@/lib/network/http";

function staffAutoApprovesIcon(perms: Set<import("@permissions-config").Permission>): boolean {
  return hasPermission(perms, "admin:panel") || hasPermission(perms, "users:moderate");
}

export async function handleUploadIcon(request: NextRequest): Promise<Response> {
  const blocked = assertSameOrigin(request) ?? rateLimit(request, "icon-upload", 10, 60 * 60 * 1000);
  if (blocked) return blocked;

  const auth = await requireVerifiedAccount();
  if (auth instanceof Response) return auth;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("Missing file", 400);
  }

  const mime = file.type || "application/octet-stream";
  const buf = Buffer.from(await file.arrayBuffer());
  const perms = await resolvePermissions(auth.accountId, auth.account.username);
  const autoApprove = staffAutoApprovesIcon(perms);

  try {
    const before = await getAccountSessionById(auth.accountId);
    const oldIds = idsFromIconUrls(before?.icon, before?.iconPending);

    const { id, url } = await saveTrackedImage({
      data: buf,
      mime,
      kind: "avatar",
      status: autoApprove ? "approved" : "pending",
      accountId: auth.accountId,
      uploadedByAccountId: auth.accountId,
      approvedByAccountId: autoApprove ? auth.accountId : null,
    });

    if (!(await loadBlogImage(id))) {
      await deleteMediaAssetRow(id);
      return jsonError("Upload failed — file not saved to disk", 500);
    }

    await replaceAccountAvatars(auth.accountId, id);
    const stale = oldIds.filter((oid) => oid !== id);
    await purgeMediaIds(stale);

    if (autoApprove) {
      await updateAccountIcon(auth.accountId, url);
    } else {
      await submitAccountIconPending(auth.accountId, url);
    }

    await dispatchSiteEvent({
      type: "media.uploaded",
      actorAccountId: auth.accountId,
      mediaId: id,
      kind: "avatar",
      status: autoApprove ? "approved" : "pending",
      pendingReview: !autoApprove,
    });

    const session = await getAccountSessionById(auth.accountId);

    return Response.json({
      icon: autoApprove ? url : session?.icon ?? null,
      iconPending: autoApprove ? null : url,
      pendingReview: !autoApprove,
      message: autoApprove ? "Photo updated" : "Photo submitted for review",
      account: session,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return jsonError(msg, 400);
  }
}

export async function handleRemoveIcon(): Promise<Response> {
  const auth = await requireVerifiedAccount();
  if (auth instanceof Response) return auth;

  const before = await getAccountSessionById(auth.accountId);
  const ids = idsFromIconUrls(before?.icon, before?.iconPending);
  await replaceAccountAvatars(auth.accountId);
  await purgeMediaIds(ids);
  await clearAccountIcons(auth.accountId);

  await dispatchSiteEvent({
    type: "icon.removed",
    actorAccountId: auth.accountId,
  });

  const session = await getAccountSessionById(auth.accountId);
  return Response.json({
    icon: null,
    iconPending: null,
    pendingReview: false,
    account: session,
  });
}
