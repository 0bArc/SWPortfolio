"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/NavbarWrapper";
import { useAccountSession } from "@/providers/AccountSessionProvider";

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SuspendedPage() {
  const router = useRouter();
  const { account, loading, refresh } = useAccountSession();
  const [logoutLoading, setLogoutLoading] = useState(false);

  async function logout() {
    setLogoutLoading(true);
    try {
      await fetch("/api/accounts/logout", { method: "POST", credentials: "same-origin" });
      await refresh();
      router.push("/");
      router.refresh();
    } finally {
      setLogoutLoading(false);
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="max-w-md mx-auto px-6 pt-24 pb-16">
          <div className="glass rounded-2xl border border-white/[0.1] p-8 animate-pulse h-48" />
        </main>
      </>
    );
  }

  if (!account?.ban) {
    return (
      <>
        <Navbar />
        <main className="max-w-md mx-auto px-6 pt-24 pb-16 text-center">
          <p className="text-sm text-gray-400">No active suspension on this account.</p>
          <Link href="/" className="inline-block mt-4 text-sm text-gray-300 hover:text-white underline">
            Go home
          </Link>
        </main>
      </>
    );
  }

  const ban = account.ban;
  const staffLabel = ban.bannedBy
    ? `@${ban.bannedBy.username}`
  : "Staff";

  return (
    <>
      <Navbar />
      <main className="max-w-md mx-auto px-6 pt-24 pb-16">
        <div className="glass rounded-2xl border border-red-500/25 bg-red-500/[0.04] p-8">
          <h1 className="text-xl font-semibold text-white mb-2">Account suspended</h1>
          <p className="text-sm text-gray-300 leading-relaxed">
            You have been suspended
            {ban.reason ? (
              <>
                {" "}
                for <span className="text-red-200">{ban.reason}</span>
              </>
            ) : (
              "."
            )}
          </p>

          <dl className="mt-6 space-y-3 text-sm">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Expires</dt>
              <dd className="text-gray-200 mt-0.5">
                {ban.expiresAt ? fmtWhen(ban.expiresAt) : "Permanent"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-gray-500">By staff</dt>
              <dd className="text-gray-200 mt-0.5">{staffLabel}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Suspended</dt>
              <dd className="text-gray-400 mt-0.5 text-xs">{fmtWhen(ban.bannedAt)}</dd>
            </div>
          </dl>

          <p className="text-[11px] text-gray-500 mt-6 leading-relaxed">
            While suspended you cannot use site features. Contact support if you believe this is a mistake.
          </p>

          <button
            type="button"
            onClick={() => void logout()}
            disabled={logoutLoading}
            className="mt-6 w-full h-10 rounded-xl border border-white/15 text-sm text-gray-300 hover:text-white hover:bg-white/[0.05] disabled:opacity-50"
          >
            {logoutLoading ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </main>
    </>
  );
}
