import "server-only";

import { appendActivity } from "@/database/accounts";
import type { SiteEvent } from "@/features/events/types";

/** Account timeline JSONB — lightweight activity mirror. */
export async function applyActivityBridge(event: SiteEvent): Promise<void> {
  switch (event.type) {
    case "comment.created":
      await appendActivity(event.actorAccountId, {
        type: "comment",
        at: new Date().toISOString(),
        meta: {
          postSlug: event.postSlug,
          ...(event.parentId != null ? { parentId: event.parentId } : {}),
        },
      });
      break;
  }
}
