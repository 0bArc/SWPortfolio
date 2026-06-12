import "server-only";

import { createNotification } from "@/database/notifications";
import { BADGE_BY_SLUG } from "@/features/accounts/services/badges/catalog";
import type { SiteEvent } from "@/features/events/types";

const ROLE_BADGES = new Set(["founder", "admin", "developer", "moderator", "author"]);

/** Persistent in-app alerts — bell notifications. */
export async function applyNotificationBridge(event: SiteEvent): Promise<void> {
  switch (event.type) {
    case "comment.created":
      if (event.parentId && event.parentAuthorId && event.parentAuthorId !== event.actorAccountId) {
        await createNotification({
          accountId: event.parentAuthorId,
          actorAccountId: event.actorAccountId,
          type: "comment_reply",
          postSlug: event.postSlug,
          commentId: event.commentId,
          message: `${event.actorDisplayName} replied to your comment`,
        });
      }
      break;

    case "icon.reviewed":
      if (event.action === "approve") {
        await createNotification({
          accountId: event.targetAccountId,
          actorAccountId: event.actorAccountId,
          type: "icon_approved",
          postSlug: event.username,
          message: "Your profile photo was approved and is now visible on your profile.",
        });
      } else {
        await createNotification({
          accountId: event.targetAccountId,
          actorAccountId: event.actorAccountId,
          type: "icon_rejected",
          postSlug: event.username,
          message:
            "Your profile photo was not approved. Upload a different image from your profile settings.",
        });
      }
      break;

    case "media.moderated":
      if (!event.targetAccountId || event.action === "delete") break;
      if (event.action === "approve") {
        await createNotification({
          accountId: event.targetAccountId,
          actorAccountId: event.actorAccountId,
          type: "media_approved",
          postSlug: event.username ?? null,
          message: `Your ${event.kind} upload was approved.`,
        });
      } else if (event.action === "reject") {
        await createNotification({
          accountId: event.targetAccountId,
          actorAccountId: event.actorAccountId,
          type: "media_rejected",
          postSlug: event.username ?? null,
          message: `Your ${event.kind} upload was not approved.`,
        });
      }
      break;

    case "user.moderated": {
      const notify = event.notify !== false;
      if (!notify && event.moderationType !== "warn") break;

      switch (event.moderationType) {
        case "force_name": {
          const name = event.displayName?.trim() ?? "";
          await createNotification({
            accountId: event.targetAccountId,
            actorAccountId: event.actorAccountId,
            type: "staff_action",
            message: `Staff changed your display name to "${name}". Contact support if this is wrong.`,
          });
          break;
        }
        case "force_bio":
          await createNotification({
            accountId: event.targetAccountId,
            actorAccountId: event.actorAccountId,
            type: "staff_action",
            message:
              "Staff updated your profile description. Check your profile and contact support if needed.",
          });
          break;
        case "warn": {
          const msg = event.message?.trim() ?? "";
          if (!msg) break;
          await createNotification({
            accountId: event.targetAccountId,
            actorAccountId: event.actorAccountId,
            type: "staff_warning",
            message: `Staff warning: ${msg}`,
          });
          break;
        }
        case "ban": {
          const untilNote = event.banUntil
            ? ` until ${new Date(event.banUntil).toLocaleString("en-GB")}`
            : "";
          const reason = event.reason?.trim();
          await createNotification({
            accountId: event.targetAccountId,
            actorAccountId: event.actorAccountId,
            type: "staff_action",
            message: reason
              ? `Your account has been suspended${untilNote}: ${reason}`
              : `Your account has been suspended${untilNote}.`,
          });
          break;
        }
        case "unban":
          await createNotification({
            accountId: event.targetAccountId,
            actorAccountId: event.actorAccountId,
            type: "staff_action",
            message: "Your account suspension has been lifted.",
          });
          break;
      }
      break;
    }

    case "user.email_verified":
      if (event.byStaff) {
        await createNotification({
          accountId: event.targetAccountId,
          actorAccountId: event.actorAccountId,
          type: "staff_action",
          message: "Your email has been verified by staff. You now have full access.",
        });
      }
      break;

    case "badge.awarded": {
      const label = event.badgeLabel ?? BADGE_BY_SLUG[event.badgeSlug]?.label ?? event.badgeSlug;
      await createNotification({
        accountId: event.targetAccountId,
        actorAccountId: event.actorAccountId,
        type: "badge_awarded",
        postSlug: event.username,
        message: `You received the "${label}" badge.`,
      });
      break;
    }

    case "badge.revoked": {
      const label = event.badgeLabel ?? BADGE_BY_SLUG[event.badgeSlug]?.label ?? event.badgeSlug;
      await createNotification({
        accountId: event.targetAccountId,
        actorAccountId: event.actorAccountId,
        type: "badge_revoked",
        postSlug: event.username,
        message: `The "${label}" badge was removed from your account.`,
      });
      break;
    }
  }
}

export { ROLE_BADGES };
