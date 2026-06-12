import "server-only";

import { appendActivity } from "@/database/accounts";
import type { SiteEvent } from "@/features/events/types";

/** Account timeline JSONB — only bridge may call appendActivity. */
export async function applyActivityBridge(event: SiteEvent): Promise<void> {
  const at = new Date().toISOString();

  switch (event.type) {
    case "comment.created":
      await appendActivity(event.actorAccountId, {
        type: "comment",
        at,
        meta: {
          postSlug: event.postSlug,
          ...(event.parentId != null ? { parentId: event.parentId } : {}),
        },
      });
      break;

    case "account.email_verification_sent":
      await appendActivity(event.targetAccountId, {
        type: "email_verification_sent",
        at,
      });
      break;

    case "user.email_verified":
      await appendActivity(event.targetAccountId, {
        type: "email_verified",
        at,
        meta: { byStaff: event.byStaff },
      });
      break;

    case "profile.updated":
      await appendActivity(event.actorAccountId, {
        type: "profile_updated",
        at,
        meta: { fields: event.changed.join(",") },
      });
      break;

    case "badge.awarded":
      await appendActivity(event.targetAccountId, {
        type: "badge_awarded",
        at,
        meta: { badgeSlug: event.badgeSlug },
      });
      break;

    case "badge.revoked":
      await appendActivity(event.targetAccountId, {
        type: "badge_revoked",
        at,
        meta: { badgeSlug: event.badgeSlug },
      });
      break;

    case "post.changed": {
      const accountId = event.authorAccountId ?? event.actorAccountId;
      if (!accountId) break;
      if (event.action === "deleted") {
        await appendActivity(accountId, {
          type: "post_deleted",
          at,
          meta: { slug: event.slug },
        });
        break;
      }
      const activityType =
        event.status === "published"
          ? event.action === "created"
            ? "post_published"
            : "post_updated"
          : "post_draft_saved";
      await appendActivity(accountId, {
        type: activityType,
        at,
        meta: { slug: event.slug, title: event.title, status: event.status },
      });
      break;
    }

    case "media.uploaded":
      await appendActivity(event.actorAccountId, {
        type: "media_uploaded",
        at,
        meta: { mediaId: event.mediaId, kind: event.kind, status: event.status },
      });
      break;

    case "api_key.created":
      await appendActivity(event.actorAccountId, {
        type: "api_key_created",
        at,
        meta: { keyId: event.keyId, keyName: event.keyName },
      });
      break;

    case "api_key.revoked":
      await appendActivity(event.actorAccountId, {
        type: "api_key_revoked",
        at,
        meta: { keyId: event.keyId },
      });
      break;
  }
}
