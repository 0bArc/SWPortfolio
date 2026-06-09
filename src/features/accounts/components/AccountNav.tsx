"use client";

import Link from "next/link";
import { useAccountSession } from "@/providers/AccountSessionProvider";

export default function AccountNav({ pillClass }: { pillClass: string }) {
  const { account } = useAccountSession();

  if (account) {
    return (
      <Link href={`/u/${account.username}`} className={pillClass}>
        Account
      </Link>
    );
  }

  return (
    <Link href="/account/login" className={pillClass}>
      Sign in
    </Link>
  );
}
