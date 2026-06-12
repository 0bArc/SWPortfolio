/**
 * @deprecated Use dispatchSiteEvent from @/features/events.
 * Kept for backward-compatible imports during migration.
 */
import { dispatchSiteEvent } from "@/features/events";
import type { SiteEvent } from "@/features/events/types";

export type SiteNotificationEvent = Extract<
  SiteEvent,
  | { type: "icon.reviewed" }
  | { type: "user.moderated" }
>;

/** @deprecated Use dispatchSiteEvent */
export async function dispatchSiteNotification(
  event:
    | { type: "icon_approved"; accountId: number; username: string }
    | { type: "icon_rejected"; accountId: number; username: string }
    | {
        type: "staff_action";
        accountId: number;
        message: string;
        actorAccountId?: number | null;
      }
    | {
        type: "staff_warning";
        accountId: number;
        message: string;
        actorAccountId?: number | null;
      }
): Promise<void> {
  switch (event.type) {
    case "icon_approved":
      await dispatchSiteEvent({
        type: "icon.reviewed",
        actorAccountId: null,
        targetAccountId: event.accountId,
        username: event.username,
        action: "approve",
      });
      break;
    case "icon_rejected":
      await dispatchSiteEvent({
        type: "icon.reviewed",
        actorAccountId: null,
        targetAccountId: event.accountId,
        username: event.username,
        action: "reject",
      });
      break;
    case "staff_action":
      await dispatchSiteEvent({
        type: "user.moderated",
        actorAccountId: event.actorAccountId ?? null,
        targetAccountId: event.accountId,
        username: "",
        moderationType: "force_bio",
        message: event.message,
        notify: true,
      });
      break;
    case "staff_warning":
      await dispatchSiteEvent({
        type: "user.moderated",
        actorAccountId: event.actorAccountId ?? null,
        targetAccountId: event.accountId,
        username: "",
        moderationType: "warn",
        message: event.message,
        notify: true,
      });
      break;
  }
}
