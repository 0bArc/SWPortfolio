import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getAccountSessionId } from "@/features/accounts/services/auth/session";
import { dispatchSiteEvent } from "@/features/events";
import { isValidSlug } from "@/features/admin/services/auth";
import {
  deleteTagStyle,
  getTagStyle,
  listTagStyles,
  parseTagStyleConfig,
  upsertTagStyle,
} from "@/lib/tags/styles";

export async function handleListTags(): Promise<Response> {
  try {
    const styles = await listTagStyles();
    return Response.json(styles);
  } catch (err) {
    console.error("listTagStyles error:", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}

export async function handleCreateTag(request: NextRequest): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = String(body.slug ?? "").trim().toLowerCase();
  if (!isValidSlug(slug)) {
    return Response.json({ error: "Invalid slug — lowercase letters, numbers, hyphens" }, { status: 400 });
  }

  const config = parseTagStyleConfig(body.config);
  if (!config) {
    return Response.json({ error: "Invalid style config" }, { status: 400 });
  }

  try {
    const record = await upsertTagStyle(slug, config);
    const actorAccountId = await getAccountSessionId();
    await dispatchSiteEvent({
      type: "tag.changed",
      actorAccountId,
      slug,
      action: "created",
    });
    revalidatePath("/blog");
    revalidatePath("/blog/[slug]", "page");
    return Response.json(record, { status: 201 });
  } catch (err) {
    console.error("upsertTagStyle error:", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}

export async function handleGetTag(slug: string): Promise<Response> {
  if (!isValidSlug(slug)) {
    return Response.json({ error: "Invalid slug" }, { status: 400 });
  }

  const record = await getTagStyle(slug);
  if (!record) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(record);
}

export async function handleUpdateTag(slug: string, request: NextRequest): Promise<Response> {
  if (!isValidSlug(slug)) {
    return Response.json({ error: "Invalid slug" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const config = parseTagStyleConfig(body.config);
  if (!config) {
    return Response.json({ error: "Invalid style config" }, { status: 400 });
  }

  try {
    const record = await upsertTagStyle(slug, config);
    const actorAccountId = await getAccountSessionId();
    await dispatchSiteEvent({
      type: "tag.changed",
      actorAccountId,
      slug,
      action: "updated",
    });
    revalidatePath("/blog");
    revalidatePath("/blog/[slug]", "page");
    return Response.json(record);
  } catch (err) {
    console.error("upsertTagStyle error:", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}

export async function handleDeleteTag(slug: string): Promise<Response> {
  if (!isValidSlug(slug)) {
    return Response.json({ error: "Invalid slug" }, { status: 400 });
  }

  const ok = await deleteTagStyle(slug);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });

  const actorAccountId = await getAccountSessionId();
  await dispatchSiteEvent({
    type: "tag.changed",
    actorAccountId,
    slug,
    action: "deleted",
  });
  revalidatePath("/blog");
  revalidatePath("/blog/[slug]", "page");
  return Response.json({ ok: true });
}
