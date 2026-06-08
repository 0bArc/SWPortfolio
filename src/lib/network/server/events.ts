import "server-only";

export type AccountStreamEvent = {
  type: "refresh" | "connected";
  data?: Record<string, unknown>;
};

type Listener = (event: AccountStreamEvent) => void;

const listeners = new Map<number, Set<Listener>>();

export function subscribeAccountEvents(accountId: number, listener: Listener): () => void {
  let set = listeners.get(accountId);
  if (!set) {
    set = new Set();
    listeners.set(accountId, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) listeners.delete(accountId);
  };
}

export function publishAccountEvent(accountId: number, event: AccountStreamEvent): void {
  const set = listeners.get(accountId);
  if (!set) return;
  for (const listener of set) listener(event);
}
