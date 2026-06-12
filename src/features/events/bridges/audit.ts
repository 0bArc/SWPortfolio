import "server-only";

import { createAuditLog } from "@/database/audit-logs";
import { publishAdminEvent } from "@/lib/network/server/events";
import { BADGE_BY_SLUG } from "@/features/accounts/services/badges/catalog";
import type { AuditCategory, SiteEvent } from "@/features/events/types";
import { ROLE_BADGES } from "@/features/events/bridges/notification";

/** Admin audit trail — auto-recorded from domain events. */
export async function applyAuditBridge(event: SiteEvent): Promise<void> {
  const entry = buildAuditEntry(event);
  if (!entry) return;

  await createAuditLog(entry);
  publishAdminEvent({ type: "refresh", channel: "admin-audit" });
}

function buildAuditEntry(event: SiteEvent): {
  eventType: string;
  category: AuditCategory;
  actorAccountId?: number | null;
  targetAccountId?: number | null;
  targetResourceType?: string | null;
  targetResourceId?: string | null;
  summary: string;
  meta?: Record<string, unknown>;
} | null {
  switch (event.type) {
    case "comment.moderated":
      return {
        eventType: event.type,
        category: "content",
        actorAccountId: event.actorAccountId,
        targetAccountId: event.targetAccountId,
        targetResourceType: "comment",
        targetResourceId: String(event.commentId),
        summary: `Comment ${event.action} on ${event.postSlug}`,
        meta: { postSlug: event.postSlug, action: event.action, reason: event.reason },
      };

    case "media.moderated":
      return {
        eventType: event.type,
        category: "media",
        actorAccountId: event.actorAccountId,
        targetAccountId: event.targetAccountId,
        targetResourceType: "media",
        targetResourceId: event.mediaId,
        summary: `Media ${event.action}: ${event.kind} ${event.mediaId.slice(0, 8)}`,
        meta: { action: event.action, kind: event.kind, username: event.username },
      };

    case "icon.reviewed":
      return {
        eventType: event.type,
        category: "media",
        actorAccountId: event.actorAccountId,
        targetAccountId: event.targetAccountId,
        targetResourceType: "user",
        targetResourceId: event.username,
        summary: `Profile photo ${event.action} for @${event.username}`,
        meta: { action: event.action },
      };

    case "user.moderated":
      return {
        eventType: event.type,
        category: "user",
        actorAccountId: event.actorAccountId,
        targetAccountId: event.targetAccountId,
        targetResourceType: "user",
        targetResourceId: event.username,
        summary: `User moderation: ${event.moderationType} on @${event.username}`,
        meta: {
          moderationType: event.moderationType,
          reason: event.reason,
          message: event.message,
          banUntil: event.banUntil,
        },
      };

    case "user.email_verified":
      if (!event.byStaff) return null;
      return {
        eventType: event.type,
        category: "account",
        actorAccountId: event.actorAccountId,
        targetAccountId: event.targetAccountId,
        targetResourceType: "user",
        targetResourceId: event.username,
        summary: `Staff verified email for @${event.username}`,
      };

    case "badge.awarded":
      return {
        eventType: event.type,
        category: ROLE_BADGES.has(event.badgeSlug) ? "role" : "badge",
        actorAccountId: event.actorAccountId,
        targetAccountId: event.targetAccountId,
        targetResourceType: "badge",
        targetResourceId: event.badgeSlug,
        summary: `Badge awarded: ${event.badgeLabel ?? BADGE_BY_SLUG[event.badgeSlug]?.label ?? event.badgeSlug} → @${event.username}`,
      };

    case "badge.revoked":
      return {
        eventType: event.type,
        category: ROLE_BADGES.has(event.badgeSlug) ? "role" : "badge",
        actorAccountId: event.actorAccountId,
        targetAccountId: event.targetAccountId,
        targetResourceType: "badge",
        targetResourceId: event.badgeSlug,
        summary: `Badge revoked: ${event.badgeLabel ?? BADGE_BY_SLUG[event.badgeSlug]?.label ?? event.badgeSlug} from @${event.username}`,
      };

    case "post.changed":
      return {
        eventType: event.type,
        category: "blog",
        actorAccountId: event.actorAccountId,
        targetAccountId: event.authorAccountId,
        targetResourceType: "post",
        targetResourceId: event.slug,
        summary: `Post ${event.action}: ${event.title} (${event.status})`,
        meta: { slug: event.slug, status: event.status, action: event.action },
      };

    case "api_key.created":
      return {
        eventType: event.type,
        category: "api_key",
        actorAccountId: event.actorAccountId,
        targetAccountId: event.actorAccountId,
        targetResourceType: "api_key",
        targetResourceId: String(event.keyId),
        summary: `API key created: ${event.keyName}`,
      };

    case "api_key.revoked":
      return {
        eventType: event.type,
        category: "api_key",
        actorAccountId: event.actorAccountId,
        targetAccountId: event.actorAccountId,
        targetResourceType: "api_key",
        targetResourceId: String(event.keyId),
        summary: `API key revoked${event.keyName ? `: ${event.keyName}` : ""}`,
      };

    default:
      return null;
  }
}
