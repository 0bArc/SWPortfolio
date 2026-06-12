import "server-only";

import { applyActivityBridge } from "@/features/events/bridges/activity";
import { applyAuditBridge } from "@/features/events/bridges/audit";
import { applyNotificationBridge } from "@/features/events/bridges/notification";
import { applySyncBridge } from "@/features/events/bridges/sync";
import type { SiteEvent } from "@/features/events/types";

/**
 * Central event dispatcher — all mutation handlers publish here.
 * Bridges fan out to SSE sync, notifications, audit logs, and activity.
 *
 * Do not call createNotification, appendActivity, or publish*Event from features.
 * logSecurityEvent is separate (auth/security table, not domain audit).
 */
export async function dispatchSiteEvent(event: SiteEvent): Promise<void> {
  applySyncBridge(event);

  await Promise.all([
    applyNotificationBridge(event).catch(() => {}),
    applyAuditBridge(event).catch(() => {}),
    applyActivityBridge(event).catch(() => {}),
  ]);
}
