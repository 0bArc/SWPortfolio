"use client";

import { useEffect } from "react";
import { useAccountSession } from "@/providers/AccountSessionProvider";
import {
  connectAccountStream,
  onNetworkRefresh,
  startSyncPoll,
} from "@/lib/network/synchronize";

/** One SSE per logged-in user; session refreshes on server push. */
export default function NetworkSyncProvider({ children }: { children: React.ReactNode }) {
  const { account, refresh } = useAccountSession();

  useEffect(() => {
    if (!account) return;

    const stream = connectAccountStream();
    const offSession = onNetworkRefresh("session", () => void refresh());
    const poll = startSyncPoll(300_000, [refresh]);

    return () => {
      stream.stop();
      offSession();
      poll.stop();
    };
  }, [account, refresh]);

  return children;
}
