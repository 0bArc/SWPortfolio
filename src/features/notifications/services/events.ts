import { createNotification } from "@/database/notifications";

/** Site events that become in-app alerts (SSE → bell). */
export type SiteNotificationEvent =
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
    };

export async function dispatchSiteNotification(
  event: SiteNotificationEvent
): Promise<void> {
  switch (event.type) {
    case "icon_approved":
      await createNotification({
        accountId: event.accountId,
        actorAccountId: null,
        type: "icon_approved",
        postSlug: event.username,
        message: "Your profile photo was approved and is now visible on your profile.",
      });
      break;
    case "icon_rejected":
      await createNotification({
        accountId: event.accountId,
        actorAccountId: null,
        type: "icon_rejected",
        postSlug: event.username,
        message:
          "Your profile photo was not approved. Upload a different image from your profile settings.",
      });
      break;
    case "staff_action":
      await createNotification({
        accountId: event.accountId,
        actorAccountId: event.actorAccountId ?? null,
        type: "staff_action",
        message: event.message,
      });
      break;
    case "staff_warning":
      await createNotification({
        accountId: event.accountId,
        actorAccountId: event.actorAccountId ?? null,
        type: "staff_warning",
        message: event.message,
      });
      break;
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}
