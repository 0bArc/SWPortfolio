import { networkJson } from "@/lib/network/client";
import type {
  CommentNode,
  NotificationItem,
  SessionAccount,
  SyncPollHandle,
  SyncStreamHandle,
} from "@/lib/network/types";

export type {
  CommentAuthor,
  CommentNode,
  NotificationActor,
  NotificationItem,
  SessionAccount,
  SyncPollHandle,
  SyncStreamHandle,
} from "@/lib/network/types";

type NotifyListener = () => void;
const notifyListeners = new Set<NotifyListener>();

function emitNotificationsChanged(): void {
  for (const fn of notifyListeners) fn();
}

/** Subscribe to local notification refresh signals (SSE + post-mutation). */
export function onNotificationsChanged(listener: NotifyListener): () => void {
  notifyListeners.add(listener);
  return () => notifyListeners.delete(listener);
}

async function afterMutation(refreshNotifications = false): Promise<void> {
  if (refreshNotifications) {
    try {
      await syncNotifications();
    } catch {
      /* ignore */
    }
  }
  emitNotificationsChanged();
}

export function countComments(nodes: CommentNode[]): number {
  let n = 0;
  for (const c of nodes) {
    n += 1 + countComments(c.replies);
  }
  return n;
}

export async function syncComments(postSlug: string): Promise<CommentNode[]> {
  const data = await networkJson<{ comments: CommentNode[] }>(
    `/api/comments/${encodeURIComponent(postSlug)}`
  );
  return data.comments ?? [];
}

export async function syncSession(): Promise<SessionAccount | null> {
  const data = await networkJson<{ account?: SessionAccount | null }>("/api/accounts/session");
  return data.account ?? null;
}

export async function syncPermissions(): Promise<string[]> {
  const data = await networkJson<{ permissions: string[] }>("/api/accounts/permissions");
  return data.permissions ?? [];
}

export async function syncNotifications(): Promise<{
  important: NotificationItem[];
  more: NotificationItem[];
  unreadCount: number;
}> {
  return networkJson("/api/notifications");
}

export async function postComment(
  postSlug: string,
  content: string,
  parentId?: number | null
): Promise<CommentNode> {
  const data = await networkJson<{ comment: CommentNode }>(
    `/api/comments/${encodeURIComponent(postSlug)}`,
    {
      method: "POST",
      body: JSON.stringify({ content, parentId: parentId ?? null }),
    }
  );
  await afterMutation(true);
  return data.comment;
}

export async function deleteComment(commentId: number): Promise<void> {
  await networkJson<{ ok: boolean }>(`/api/comments/by-id/${commentId}`, { method: "DELETE" });
  await afterMutation(false);
}

export async function markNotificationsRead(ids?: number[]): Promise<void> {
  await networkJson("/api/notifications", {
    method: "PATCH",
    body: JSON.stringify(ids ? { ids } : { all: true }),
  });
  await afterMutation(true);
}

export async function suppressNotificationsFrom(username: string): Promise<void> {
  await networkJson("/api/notifications/suppress", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
  await afterMutation(true);
}

export async function unsuppressNotificationsFrom(username: string): Promise<void> {
  await networkJson(`/api/notifications/suppress/${encodeURIComponent(username)}`, {
    method: "DELETE",
  });
  await afterMutation(true);
}

/** Live push via API SSE — instant notifications, rate-limited server-side. */
export function connectNotificationStream(onRefresh: () => void): SyncStreamHandle {
  if (typeof EventSource === "undefined") {
    return { stop: () => {} };
  }

  let es: EventSource | null = null;
  let retryMs = 1000;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const connect = () => {
    if (stopped) return;
    es?.close();
    es = new EventSource("/api/notifications/stream");

    es.addEventListener("connected", () => {
      retryMs = 1000;
    });

    es.addEventListener("refresh", () => {
      onRefresh();
      emitNotificationsChanged();
    });

    es.onerror = () => {
      es?.close();
      es = null;
      if (stopped) return;
      retryTimer = setTimeout(() => {
        retryMs = Math.min(retryMs * 2, 30_000);
        connect();
      }, retryMs);
    };
  };

  connect();

  return {
    stop: () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
      es = null;
    },
  };
}

/** Slow backup poll when SSE reconnects. */
export function startSyncPoll(
  intervalMs: number,
  tasks: Array<() => void | Promise<void>>
): SyncPollHandle {
  let active = true;
  const run = () => {
    if (!active) return;
    void Promise.all(tasks.map((t) => t())).catch(() => {});
  };
  const id = window.setInterval(run, intervalMs);
  return {
    stop: () => {
      active = false;
      window.clearInterval(id);
    },
  };
}
