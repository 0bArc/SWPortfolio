"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type SessionAccount = {
  username: string;
  displayName: string;
  icon: string | null;
};

type AccountSessionCtx = {
  account: SessionAccount | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setAccount: (account: SessionAccount | null) => void;
};

const AccountSessionContext = createContext<AccountSessionCtx>({
  account: null,
  loading: true,
  refresh: async () => {},
  setAccount: () => {},
});

export function AccountSessionProvider({
  children,
  initialAccount = null,
}: {
  children: React.ReactNode;
  initialAccount?: SessionAccount | null;
}) {
  const [account, setAccount] = useState<SessionAccount | null>(initialAccount);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts/session", { credentials: "same-origin" });
      const data = (await res.json()) as { account?: SessionAccount | null };
      setAccount(data.account ?? null);
    } catch {
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ account, loading, refresh, setAccount }),
    [account, loading, refresh]
  );

  return (
    <AccountSessionContext.Provider value={value}>
      {children}
    </AccountSessionContext.Provider>
  );
}

export function useAccountSession() {
  return useContext(AccountSessionContext);
}
