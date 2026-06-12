import "server-only";

import {
  publishAccountEvent,
  publishAdminEvent,
  publishBroadcastEvent,
} from "@/lib/network/server/events";
import type { SiteEvent } from "@/features/events/types";

/** Push live UI refresh via SSE — transport layer only. */
export function applySyncBridge(event: SiteEvent): void {
  switch (event.type) {
    case "comment.created":
    case "comment.moderated":
      publishBroadcastEvent({
        type: "refresh",
        channel: "comments",
        data: { postSlug: event.postSlug },
      });
      break;

    case "media.moderated":
      publishAdminEvent({
        type: "refresh",
        channel: "admin-media",
        data: { mediaId: event.mediaId, status: event.action },
      });
      if (event.kind === "avatar" && event.targetAccountId) {
        publishAdminEvent({ type: "refresh", channel: "admin-icons" });
        publishAccountEvent(event.targetAccountId, { type: "refresh", channel: "session" });
        publishAccountEvent(event.targetAccountId, { type: "refresh", channel: "profile" });
      }
      break;

    case "icon.reviewed":
      publishAdminEvent({ type: "refresh", channel: "admin-icons" });
      publishAdminEvent({
        type: "refresh",
        channel: "admin-media",
        data: { username: event.username, action: event.action },
      });
      publishAccountEvent(event.targetAccountId, { type: "refresh", channel: "session" });
      publishAccountEvent(event.targetAccountId, { type: "refresh", channel: "profile" });
      break;

    case "icon.uploaded":
      if (event.pendingReview) {
        publishAdminEvent({ type: "refresh", channel: "admin-icons" });
        publishAdminEvent({ type: "refresh", channel: "admin-media" });
      } else {
        publishAccountEvent(event.actorAccountId, { type: "refresh", channel: "session" });
      }
      publishAccountEvent(event.actorAccountId, { type: "refresh", channel: "profile" });
      break;

    case "media.uploaded":
      if (event.pendingReview) {
        if (event.kind === "avatar") {
          publishAdminEvent({ type: "refresh", channel: "admin-icons" });
        }
        publishAdminEvent({ type: "refresh", channel: "admin-media" });
      } else if (event.kind === "avatar") {
        publishAccountEvent(event.actorAccountId, { type: "refresh", channel: "session" });
        publishAccountEvent(event.actorAccountId, { type: "refresh", channel: "profile" });
      }
      break;

    case "icon.removed":
      publishAccountEvent(event.actorAccountId, { type: "refresh", channel: "profile" });
      publishAccountEvent(event.actorAccountId, { type: "refresh", channel: "session" });
      break;

    case "user.moderated":
    case "user.email_verified":
      publishAccountEvent(event.targetAccountId, { type: "refresh", channel: "session" });
      publishAccountEvent(event.targetAccountId, { type: "refresh", channel: "profile" });
      break;

    case "badge.awarded":
    case "badge.revoked":
      publishAccountEvent(event.targetAccountId, { type: "refresh", channel: "profile" });
      break;

    case "post.changed":
      publishAdminEvent({
        type: "refresh",
        channel: "posts",
        data: { slug: event.slug, status: event.status, action: event.action },
      });
      break;

    case "tag.changed":
      publishAdminEvent({
        type: "refresh",
        channel: "posts",
        data: { tag: event.slug, action: event.action },
      });
      break;

    case "profile.updated":
      publishAccountEvent(event.actorAccountId, { type: "refresh", channel: "profile" });
      break;

    case "session.updated":
      publishAccountEvent(event.targetAccountId, { type: "refresh", channel: "session" });
      break;

  }
}
