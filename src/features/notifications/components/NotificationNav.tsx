"use client";

import Link from "next/link";
import { Bell, BellOff, MoreVertical } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import AccountAvatar from "@/features/accounts/components/AccountAvatar";
import { useAccountSession } from "@/providers/AccountSessionProvider";
import {
  markNotificationsRead,
  onNotificationsChanged,
  startSyncPoll,
  suppressNotificationsFrom,
  syncNotifications,
  type NotificationItem,
} from "@/lib/network/synchronize";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function NotificationRow({
  item,
  onRead,
  onSuppress,
}: {
  item: NotificationItem;
  onRead: (id: number) => void;
  onSuppress: (username: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function openMenu() {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 260;
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    const top = rect.bottom + 6;
    setMenuPos({ top, left });
    setMenuOpen(true);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <div
      className={`flex gap-3 px-4 py-3 hover:bg-white/[0.06] transition-colors ${
        !item.read ? "bg-white/[0.03]" : ""
      }`}
    >
      <div className="w-2 shrink-0 flex items-start pt-3">
        {!item.read && <span className="w-2 h-2 rounded-full bg-sky-400" aria-hidden />}
      </div>
      {item.actor && (
        <Link href={`/u/${item.actor.username}`} className="shrink-0" onClick={() => onRead(item.id)}>
          <AccountAvatar
            username={item.actor.username}
            displayName={item.actor.displayName}
            icon={item.actor.icon}
            size={36}
          />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <Link
          href={item.href}
          onClick={() => onRead(item.id)}
          className="block text-[13px] leading-snug text-gray-100 hover:text-white"
        >
          {item.message}
        </Link>
        <p className="text-xs text-gray-300 mt-1">{relativeTime(item.createdAt)}</p>
      </div>
      {item.actor && (
        <div className="relative shrink-0 self-start">
          <button
            ref={btnRef}
            type="button"
            aria-expanded={menuOpen}
            aria-label="Notification options"
            onClick={() => (menuOpen ? setMenuOpen(false) : openMenu())}
            className={`p-1.5 rounded-full transition-colors ${
              menuOpen
                ? "text-white bg-white/15"
                : "text-gray-300 hover:text-white hover:bg-white/10"
            }`}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && menuPos && (
            <div
              ref={menuRef}
              style={{ top: menuPos.top, left: menuPos.left }}
              className="fixed z-[300] w-[260px] rounded-xl border border-white/20 bg-[#2a2a2a] py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.65)] ring-1 ring-white/10"
            >
              <p className="px-3.5 pt-1.5 pb-2 text-[11px] font-medium text-gray-300 uppercase tracking-wide">
                Options
              </p>
              <button
                type="button"
                className="w-full flex items-start gap-3 px-3.5 py-2.5 text-left hover:bg-white/10 transition-colors"
                onClick={() => {
                  onSuppress(item.actor!.username);
                  setMenuOpen(false);
                }}
              >
                <BellOff className="w-4 h-4 shrink-0 text-gray-300 mt-0.5" aria-hidden />
                <span>
                  <span className="block text-sm text-white leading-snug">
                    Mute @{item.actor!.username}
                  </span>
                  <span className="block text-xs text-gray-300 mt-0.5 leading-snug">
                    Stop notifications from this user
                  </span>
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function NotificationNav({ pillClass }: { pillClass?: string }) {
  const { account } = useAccountSession();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [important, setImportant] = useState<NotificationItem[]>([]);
  const [more, setMore] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    if (!account) return;
    try {
      const data = await syncNotifications();
      setImportant(data.important);
      setMore(data.more);
      setUnreadCount(data.unreadCount);
    } catch {
      /* logged out or network blip */
    }
  }, [account]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!account) return;
    void refresh();
    const off = onNotificationsChanged(() => void refresh());
    const poll = startSyncPoll(300_000, [refresh]);
    return () => {
      off();
      poll.stop();
    };
  }, [account, refresh]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!mounted || !account) return null;

  async function markRead(id: number) {
    await markNotificationsRead([id]);
    await refresh();
  }

  async function markAllRead() {
    await markNotificationsRead();
    await refresh();
  }

  async function suppress(username: string) {
    await suppressNotificationsFrom(username);
    await refresh();
  }

  const btnClass = pillClass ?? "p-2 rounded-lg hover:bg-white/8 text-gray-400 hover:text-white transition-all";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void refresh();
        }}
        className={`relative ${btnClass}`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(24rem,calc(100vw-1.5rem))] max-h-[min(28rem,70vh)] overflow-hidden rounded-xl border border-white/10 bg-[#181818] shadow-[0_12px_40px_rgba(0,0,0,0.55)] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-sm font-semibold text-white">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs text-gray-300 hover:text-white"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {important.length === 0 && more.length === 0 ? (
              <p className="px-4 py-8 text-sm text-gray-400 text-center">No notifications yet</p>
            ) : (
              <>
                {important.length > 0 && (
                  <section>
                    <h3 className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-300">Important</h3>
                    {important.map((item) => (
                      <NotificationRow
                        key={item.id}
                        item={item}
                        onRead={(id) => void markRead(id)}
                        onSuppress={(u) => void suppress(u)}
                      />
                    ))}
                  </section>
                )}
                {more.length > 0 && (
                  <section className={important.length > 0 ? "border-t border-white/10 mt-1" : ""}>
                    <h3 className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-300">
                      More notifications
                    </h3>
                    {more.map((item) => (
                      <NotificationRow
                        key={item.id}
                        item={item}
                        onRead={(id) => void markRead(id)}
                        onSuppress={(u) => void suppress(u)}
                      />
                    ))}
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
