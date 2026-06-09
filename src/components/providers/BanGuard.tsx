"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccountSession } from "@/providers/AccountSessionProvider";

const ALLOWED_PREFIXES = ["/account/suspended"];

export default function BanGuard({ children }: { children: React.ReactNode }) {
  const { account, loading } = useAccountSession();
  const pathname = usePathname();
  const router = useRouter();

  if (pathname.startsWith("/admin")) return children;

  const suspended = Boolean(account?.ban);
  const allowed = ALLOWED_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (loading || !suspended || allowed) return;
    router.replace("/account/suspended");
  }, [loading, suspended, allowed, router]);

  if (suspended && !allowed) return null;

  return children;
}
