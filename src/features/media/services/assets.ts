import {
  deleteMediaAssetRow,
  getMediaAssetById,
  insertMediaAsset,
  listAvatarIdsForAccount,
  supersedeAccountMedia,
  updateMediaStatus,
  type MediaKind,
  type MediaStatus,
} from "@/database/media";
import {
  listAccountsReferencingImage,
  updateAccountIcon,
} from "@/database/accounts";
import {
  deleteBlogImage,
  imageIdFromUrl,
  loadBlogImage,
  saveBlogImage,
} from "@/features/blog/services/images";

export type TrackedUpload = {
  id: string;
  url: string;
};

export type SaveTrackedImageInput = {
  data: Buffer;
  mime: string;
  kind: MediaKind;
  status: MediaStatus;
  accountId?: number | null;
  uploadedByAccountId?: number | null;
  approvedByAccountId?: number | null;
};

export async function saveTrackedImage(input: SaveTrackedImageInput): Promise<TrackedUpload> {
  const { id, url, contentHash, reused } = await saveBlogImage(input.data, input.mime);
  if (!reused) {
    await insertMediaAsset({
      id,
      accountId: input.accountId ?? input.uploadedByAccountId ?? null,
      uploadedByAccountId: input.uploadedByAccountId ?? null,
      kind: input.kind,
      status: input.status,
      fileSize: input.data.length,
      approvedByAccountId: input.approvedByAccountId ?? null,
      contentHash,
    });
  }
  return { id, url };
}

export async function purgeMediaIds(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteBlogImage(id)));
}

/** Supersede prior avatar rows + delete files (keep one id if set). */
export async function replaceAccountAvatars(
  accountId: number,
  keepId?: string
): Promise<void> {
  const superseded = await supersedeAccountMedia(accountId, "avatar", keepId);
  const toDelete = keepId ? superseded.filter((id) => id !== keepId) : superseded;
  await purgeMediaIds(toDelete);
}

async function pruneStaleAvatarMedia(accountId: number): Promise<void> {
  for (const avatarId of await listAvatarIdsForAccount(accountId)) {
    if (!(await loadBlogImage(avatarId))) {
      await deleteMediaAssetRow(avatarId);
    }
  }
}

async function pickWorkingAvatarUrl(accountId: number): Promise<string | null> {
  await pruneStaleAvatarMedia(accountId);
  for (const avatarId of await listAvatarIdsForAccount(accountId)) {
    if (await loadBlogImage(avatarId)) return `/api/images/${avatarId}`;
  }
  return null;
}

export async function resolveWorkingIconUrl(
  storedIcon: string | null | undefined,
  accountId?: number | null
): Promise<string | null> {
  const storedId = imageIdFromUrl(storedIcon);
  if (storedId && (await loadBlogImage(storedId))) return storedIcon!;

  if (!accountId) return null;

  const fallback = await pickWorkingAvatarUrl(accountId);
  if (fallback !== storedIcon) {
    await updateAccountIcon(accountId, fallback);
  }
  return fallback;
}

async function reconcileAccountsAfterImageDelete(imageId: string): Promise<void> {
  const accountIds = await listAccountsReferencingImage(imageId);
  for (const accountId of accountIds) {
    const next = await pickWorkingAvatarUrl(accountId);
    await updateAccountIcon(accountId, next);
  }
}

export async function rejectMediaId(id: string): Promise<void> {
  await updateMediaStatus(id, "rejected");
  await deleteBlogImage(id);
  await reconcileAccountsAfterImageDelete(id);
}

export async function deleteMediaAsset(id: string): Promise<boolean> {
  const ok = await deleteMediaAssetRow(id);
  if (!ok) return false;
  await deleteBlogImage(id);
  await reconcileAccountsAfterImageDelete(id);
  return true;
}

export async function approveMediaId(id: string, approvedByAccountId?: number | null): Promise<void> {
  if (!(await loadBlogImage(id))) {
    throw new Error("Image file missing — cannot approve");
  }
  await updateMediaStatus(id, "approved", approvedByAccountId ?? null);
  const asset = await getMediaAssetById(id);
  if (asset?.kind === "avatar" && asset.accountId) {
    await updateAccountIcon(asset.accountId, `/api/images/${id}`);
  }
}

export function idsFromIconUrls(...urls: (string | null | undefined)[]): string[] {
  return urls.map(imageIdFromUrl).filter((id): id is string => !!id);
}
