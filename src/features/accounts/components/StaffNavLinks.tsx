"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccountSession } from "@/providers/AccountSessionProvider";

type Caps = { admin: boolean; author: boolean };

export default function StaffNavLinks({
  pillClass,
  onNavigate,
}: {
  pillClass: string;
  onNavigate?: () => void;
}) {
  const { account } = useAccountSession();
  const [caps, setCaps] = useState<Caps | null>(null);

  useEffect(() => {
    if (!account) {
      setCaps(null);
      return;
    }
    let cancelled = false;
    void fetch("/api/accounts/permissions", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { canAdminPanel?: boolean; canWritePosts?: boolean } | null) => {
        if (cancelled || !data) return;
        setCaps({
          admin: !!data.canAdminPanel,
          author: !!data.canWritePosts,
        });
      })
      .catch(() => setCaps(null));
    return () => {
      cancelled = true;
    };
  }, [account]);

  if (!caps || (!caps.admin && !caps.author)) return null;

  return (
    <>
      {caps.admin && (
        <Link href="/admin" className={pillClass} onClick={onNavigate}>
          Admin
        </Link>
      )}
      {caps.author && (
        <Link href="/author" className={pillClass} onClick={onNavigate}>
          Author
        </Link>
      )}
    </>
  );
}
