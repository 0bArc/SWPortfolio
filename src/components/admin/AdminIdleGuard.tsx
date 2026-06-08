"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { IdleConfig } from "@/lib/admin/session-idle";

const EVENTS = ["mousedown", "keydown", "touchstart"] as const;
const RENEW_DEBOUNCE_MS = 60_000;

async function renewSession(): Promise<boolean> {
  const res = await fetch("/api/admin/renew", { method: "POST" });
  return res.ok;
}

async function logoutSession(router: ReturnType<typeof useRouter>) {
  await fetch("/api/admin/logout", { method: "POST" });
  router.push("/admin/login");
  router.refresh();
}

export default function AdminIdleGuard({ config }: { config: IdleConfig }) {
  const router = useRouter();
  const lastActivity = useRef(0);
  const lastRenew = useRef(0);
  const warningOpen = useRef(false);
  const loggingOut = useRef(false);
  const [open, setOpen] = useState(false);
  const [remainingMs, setRemainingMs] = useState(config.warnBeforeMs);

  const resetActivity = useCallback(() => {
    lastActivity.current = Date.now();
  }, []);

  const dismissWarning = useCallback(async () => {
    warningOpen.current = false;
    setOpen(false);
    resetActivity();
    await renewSession();
    lastRenew.current = Date.now();
  }, [resetActivity]);

  const forceLogout = useCallback(async () => {
    warningOpen.current = false;
    setOpen(false);
    await logoutSession(router);
  }, [router]);

  // Start idle clock when guard mounts (after login redirect).
  useEffect(() => {
    const now = Date.now();
    lastActivity.current = now;
    lastRenew.current = now;
  }, []);

  useEffect(() => {
    const onActivity = () => {
      if (warningOpen.current) return;
      resetActivity();
      const now = Date.now();
      if (now - lastRenew.current >= RENEW_DEBOUNCE_MS) {
        lastRenew.current = now;
        void renewSession();
      }
    };

    for (const e of EVENTS) {
      window.addEventListener(e, onActivity, { passive: true });
    }
    return () => {
      for (const e of EVENTS) {
        window.removeEventListener(e, onActivity);
      }
    };
  }, [resetActivity]);

  useEffect(() => {
    const { idleMs, warnAtMs } = config;

    const tick = () => {
      const idle = Date.now() - lastActivity.current;

      if (idle >= idleMs) {
        if (loggingOut.current) return;
        loggingOut.current = true;
        void forceLogout();
        return;
      }

      if (idle >= warnAtMs) {
        if (!warningOpen.current) {
          warningOpen.current = true;
          setOpen(true);
        }
        setRemainingMs(idleMs - idle);
      }
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [config, forceLogout]);

  if (!open) return null;

  const warnLabel = config.testMode
    ? `${Math.max(1, Math.ceil(remainingMs / 1000))} seconds`
    : "2 minutes";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="idle-title"
        className="glass w-full max-w-lg rounded-2xl border border-white/15 p-8 shadow-2xl"
      >
        <h2 id="idle-title" className="text-xl font-semibold text-white mb-3">
          Session idle
        </h2>
        <p className="text-base text-gray-300 leading-relaxed mb-8">
          Hi, looks like you&apos;re currently idle, you will be logged out in {warnLabel}
        </p>
        <div className="flex justify-end gap-3">
          <button type="button" className="admin-btn admin-btn--outline admin-btn--md" onClick={() => void dismissWarning()}>
            OK
          </button>
          <button type="button" className="admin-btn admin-btn--primary admin-btn--md" onClick={() => void dismissWarning()}>
            Renew
          </button>
        </div>
      </div>
    </div>
  );
}
