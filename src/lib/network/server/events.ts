import "server-only";

export type AccountStreamChannel =
  | "notifications"
  | "session"
  | "profile"
  | "comments";

export type AdminStreamChannel =
  | "admin-icons"
  | "admin-media"
  | "admin-audit"
  | "posts";

export type StreamChannel = AccountStreamChannel | AdminStreamChannel;

export type AccountStreamEvent = {
  type: "refresh" | "connected";
  channel?: AccountStreamChannel;
  data?: Record<string, unknown>;
};

export type AdminStreamEvent = {
  type: "refresh" | "connected";
  channel?: AdminStreamChannel;
  data?: Record<string, unknown>;
};

type AccountListener = (event: AccountStreamEvent) => void;
type AdminListener = (event: AdminStreamEvent) => void;

const accountListeners = new Map<number, Set<AccountListener>>();
const adminListeners = new Set<AdminListener>();

export function subscribeAccountEvents(accountId: number, listener: AccountListener): () => void {
  let set = accountListeners.get(accountId);
  if (!set) {
    set = new Set();
    accountListeners.set(accountId, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) accountListeners.delete(accountId);
  };
}

export function subscribeAdminEvents(listener: AdminListener): () => void {
  adminListeners.add(listener);
  return () => adminListeners.delete(listener);
}

export function publishAccountEvent(accountId: number, event: AccountStreamEvent): void {
  const set = accountListeners.get(accountId);
  if (!set) return;
  for (const listener of set) listener(event);
}

/** Push to every connected account stream (e.g. new comment on a post). */
export function publishBroadcastEvent(event: AccountStreamEvent): void {
  for (const set of accountListeners.values()) {
    for (const listener of set) listener(event);
  }
}

export function publishAdminEvent(event: AdminStreamEvent): void {
  for (const listener of adminListeners) listener(event);
}
