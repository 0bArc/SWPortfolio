"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
type StaffTarget = {
  username: string;
  displayName: string;
  bio: string;
  badgeSlugs: string[];
  badges: { slug: string; label: string }[];
  bannedAt: string | null;
  banReason: string | null;
  bannedUntil: string | null;
  bannedBy: { username: string; displayName: string } | null;
  warningCount: number;
  emailVerified: boolean;
};

type Capabilities = {
  canAwardBadges: boolean;
  canModerate: boolean;
  grantable: { slug: string; label: string; description: string }[];
};

type Tab = "badges" | "profile" | "moderation";

export default function StaffPanel({ targetUsername }: { targetUsername: string }) {
  const router = useRouter();
  const [target, setTarget] = useState<StaffTarget | null>(null);
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [tab, setTab] = useState<Tab>("badges");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [notifyUser, setNotifyUser] = useState(true);
  const [warnMessage, setWarnMessage] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banUntil, setBanUntil] = useState("");

  const base = `/api/accounts/staff/${encodeURIComponent(targetUsername)}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(base, { credentials: "same-origin" });
      const data = (await res.json()) as {
        target?: StaffTarget;
        capabilities?: Capabilities;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not load staff panel");
        setTarget(null);
        return;
      }
      setTarget(data.target ?? null);
      setCaps(data.capabilities ?? null);
      if (data.target) {
        setDisplayName(data.target.displayName);
        setBio(data.target.bio);
      }
      const canBadges =
        data.capabilities?.canAwardBadges || (data.capabilities?.grantable?.length ?? 0) > 0;
      if (data.capabilities?.canModerate && !canBadges) {
        setTab("profile");
      } else if (canBadges) {
        setTab("badges");
      }
    } catch {
      setError("Could not load staff panel");
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    void load();
  }, [load]);

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    {
      id: "badges",
      label: "Badges",
      show: !!caps?.canAwardBadges || (caps?.grantable?.length ?? 0) > 0,
    },
    { id: "profile", label: "Profile", show: !!caps?.canModerate },
    { id: "moderation", label: "Moderation", show: !!caps?.canModerate },
  ].filter((t) => t.show);

  async function moderate(body: Record<string, unknown>, okMsg: string): Promise<boolean> {
    setActing(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${base}/moderate`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as StaffTarget & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Action failed");
        return false;
      }
      setMessage(okMsg);
      await load();
      router.refresh();
      return true;
    } catch {
      setError("Action failed");
      return false;
    } finally {
      setActing(false);
    }
  }

  async function awardSelected() {
    const slugs = [...selectedSlugs];
    if (slugs.length === 0) return;
    setActing(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${base}/badges`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs }),
      });
      const data = (await res.json()) as { error?: string; awarded?: string[] };
      if (!res.ok) {
        setError(data.error ?? "Could not award");
        return;
      }
      setSelectedSlugs(new Set());
      setMessage(`Awarded ${data.awarded?.length ?? slugs.length} badge(s)`);
      await load();
      router.refresh();
    } catch {
      setError("Could not award");
    } finally {
      setActing(false);
    }
  }

  async function revokeBadge(slug: string) {
    setActing(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${base}/badges`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not remove badge");
        return;
      }
      setMessage("Badge removed");
      await load();
      router.refresh();
    } catch {
      setError("Could not remove badge");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <aside className="glass rounded-2xl border border-white/[0.1] p-4 h-32 animate-pulse" />
    );
  }

  if (!target || !caps || tabs.length === 0) return null;

  return (
    <aside className="glass rounded-2xl border border-white/[0.1] p-4 h-fit lg:sticky lg:top-[calc(var(--banner-h,0px)+4rem)] lg:w-80">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1">
        Staff panel
      </h2>
      <p className="text-[10px] text-gray-600 mb-3 font-mono">@{target.username}</p>

      <div className="flex gap-1 border-b border-white/[0.08] mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide rounded-t transition-colors ${
              tab === t.id ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "badges" && caps.canAwardBadges && (
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
              Current badges
            </p>
            {target.badges.length === 0 ? (
              <p className="text-[11px] text-gray-600">None</p>
            ) : (
              <ul className="space-y-1">
                {target.badges.map((b) => (
                  <li key={b.slug} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-300">{b.label}</span>
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => void revokeBadge(b.slug)}
                      className="text-[10px] text-red-400/80 hover:text-red-300 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
              Award badges
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {caps.grantable.map((b) => {
                const on = selectedSlugs.has(b.slug);
                return (
                  <button
                    key={b.slug}
                    type="button"
                    disabled={acting || target.badgeSlugs.includes(b.slug)}
                    onClick={() =>
                      setSelectedSlugs((prev) => {
                        const next = new Set(prev);
                        if (next.has(b.slug)) next.delete(b.slug);
                        else next.add(b.slug);
                        return next;
                      })
                    }
                    className={`px-2 py-1 rounded-md border text-[10px] font-medium transition-colors disabled:opacity-40 ${
                      on
                        ? "border-sky-500/50 bg-sky-500/15 text-sky-200"
                        : "border-white/10 bg-white/[0.03] text-gray-400 hover:text-gray-200"
                    }`}
                    title={b.description}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={acting || selectedSlugs.size === 0}
              onClick={() => void awardSelected()}
              className="w-full h-8 rounded-lg border border-white/15 bg-white/[0.04] text-xs text-gray-200 hover:bg-white/[0.08] disabled:opacity-50"
            >
              {acting ? "Working…" : `Award selected (${selectedSlugs.size})`}
            </button>
          </div>
        </div>
      )}

      {tab === "profile" && caps.canModerate && (
        <div className="space-y-3">
          <p className="text-[10px] text-amber-200/70 leading-snug">
            Forced changes notify user by default.
          </p>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Display name
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full h-8 rounded-lg border border-white/10 bg-black/40 px-2.5 text-xs text-white"
            maxLength={64}
          />
          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full min-h-[72px] rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-xs text-white resize-y"
            maxLength={500}
          />
          <label className="flex items-center gap-2 text-[10px] text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyUser}
              onChange={(e) => setNotifyUser(e.target.checked)}
              className="accent-white"
            />
            Notify user
          </label>
          <button
            type="button"
            disabled={acting}
            onClick={async () => {
              if (displayName.trim() !== target.displayName) {
                await moderate(
                  { type: "force_name", displayName: displayName.trim(), notify: notifyUser },
                  "Name updated"
                );
              }
              if (bio.trim() !== target.bio) {
                await moderate({ type: "force_bio", bio: bio.trim(), notify: notifyUser }, "Bio updated");
              }
            }}
            className="w-full h-8 rounded-lg border border-white/15 bg-white/[0.04] text-xs text-gray-200 hover:bg-white/[0.08] disabled:opacity-50"
          >
            Force save
          </button>
          {!target.emailVerified && (
            <button
              type="button"
              disabled={acting}
              onClick={() => void moderate({ type: "force_verify_email" }, "Email verified")}
              className="w-full h-8 rounded-lg border border-sky-500/30 bg-sky-500/10 text-xs text-sky-200 hover:bg-sky-500/15 disabled:opacity-50"
            >
              Force verify email
            </button>
          )}
        </div>
      )}

      {tab === "moderation" && caps.canModerate && (
        <div className="space-y-4">
          {target.bannedAt ? (
            <div className="rounded-lg border border-red-500/25 bg-red-500/[0.06] px-3 py-2">
              <p className="text-xs text-red-200 font-medium">Suspended</p>
              {target.banReason && (
                <p className="text-[10px] text-red-200/70 mt-1">{target.banReason}</p>
              )}
              {target.bannedUntil && (
                <p className="text-[10px] text-red-200/50 mt-1">
                  Until {new Date(target.bannedUntil).toLocaleString("en-GB")}
                </p>
              )}
              <button
                type="button"
                disabled={acting}
                onClick={() => void moderate({ type: "unban" }, "Ban lifted")}
                className="mt-2 text-[10px] text-gray-300 hover:text-white"
              >
                Lift ban
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Ban</p>
              <input
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Reason (optional)"
                className="w-full h-8 rounded-lg border border-white/10 bg-black/40 px-2.5 text-xs text-white"
                maxLength={200}
              />
              <input
                type="datetime-local"
                value={banUntil}
                onChange={(e) => setBanUntil(e.target.value)}
                className="w-full h-8 rounded-lg border border-white/10 bg-black/40 px-2.5 text-xs text-white"
              />
              <button
                type="button"
                disabled={acting}
                onClick={() =>
                  void moderate(
                    {
                      type: "ban",
                      reason: banReason,
                      banUntil: banUntil ? new Date(banUntil).toISOString() : null,
                    },
                    "User banned"
                  )
                }
                className="w-full h-8 rounded-lg border border-red-500/30 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
              >
                Ban account
              </button>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Warning</p>
            <textarea
              value={warnMessage}
              onChange={(e) => setWarnMessage(e.target.value)}
              placeholder="Message sent as notification"
              className="w-full min-h-[64px] rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-xs text-white resize-y"
              maxLength={500}
            />
            <button
              type="button"
              disabled={acting || !warnMessage.trim()}
              onClick={async () => {
                const ok = await moderate(
                  { type: "warn", message: warnMessage.trim() },
                  "Warning sent"
                );
                if (ok) setWarnMessage("");
              }}
              className="w-full h-8 rounded-lg border border-white/15 bg-white/[0.04] text-xs text-gray-200 hover:bg-white/[0.08] disabled:opacity-50"
            >
              Send warning
            </button>
          </div>

          {target.warningCount > 0 && (
            <p className="text-[10px] text-gray-600">{target.warningCount} prior warning(s)</p>
          )}
        </div>
      )}

      {(error || message) && (
        <p className={`text-[11px] mt-3 ${error ? "text-red-400" : "text-gray-500"}`}>
          {error || message}
        </p>
      )}
    </aside>
  );
}
