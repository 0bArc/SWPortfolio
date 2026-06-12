"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import type { AccountListItem, AccountSettings } from "@/database/schema";
import { BADGE_BY_SLUG, BADGES } from "@/features/accounts/services/badges/definitions";
import { roleLabelsForUser } from "@/features/accounts/services/permissions/roles";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ListResponse = {
  users: AccountListItem[];
  total: number;
  page: number;
  pageSize: number;
};

type EditorTab = "profile" | "badges" | "moderation" | "account";

const TABS: { id: EditorTab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "badges", label: "Badges" },
  { id: "moderation", label: "Moderation" },
  { id: "account", label: "Account" },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const ROLE_STYLES: Record<string, string> = {
  Founder: "bg-red-500/15 text-red-300 border-red-500/35",
  Administrator: "bg-violet-500/15 text-violet-300 border-violet-500/35",
  Developer: "bg-sky-500/15 text-sky-300 border-sky-500/35",
  Moderator: "bg-amber-500/15 text-amber-300 border-amber-500/35",
  Author: "bg-violet-500/15 text-violet-300 border-violet-500/35",
  Member: "bg-white/[0.06] text-gray-400 border-white/12",
};

function RolePill({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
        ROLE_STYLES[role] ?? ROLE_STYLES.Member
      }`}
    >
      {role}
    </span>
  );
}

function SettingToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-2.5 border-b border-white/[0.06] last:border-0 cursor-pointer">
      <span className="min-w-0">
        <span className="block text-sm text-gray-200">{label}</span>
        <span className="block text-[10px] text-gray-500">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-white shrink-0"
      />
    </label>
  );
}

function UserEditor({
  user,
  grantableSlugs,
  onUpdated,
  onDeleted,
}: {
  user: AccountListItem;
  grantableSlugs: string[];
  onUpdated: (u: AccountListItem) => void;
  onDeleted: () => void;
}) {
  const [tab, setTab] = useState<EditorTab>("profile");
  const [draft, setDraft] = useState(user);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio);
  const [notifyUser, setNotifyUser] = useState(true);
  const [warnMessage, setWarnMessage] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banUntil, setBanUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [badgeLoading, setBadgeLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDraft(user);
    setDisplayName(user.displayName);
    setBio(user.bio);
    setError("");
    setMessage("");
    setDeleteConfirm(false);
    setWarnMessage("");
    setBanReason("");
    setBanUntil("");
  }, [user]);

  useEffect(() => {
    setTab("profile");
  }, [user.username]);

  const roles = roleLabelsForUser(draft.username, draft.badgeSlugs);

  async function moderate(
    body: Record<string, unknown>,
    okMsg: string
  ): Promise<boolean> {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(draft.username)}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as AccountListItem & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Action failed");
        return false;
      }
      setDraft(data);
      setDisplayName(data.displayName);
      setBio(data.bio);
      onUpdated(data);
      setMessage(okMsg);
      return true;
    } catch {
      setError("Action failed");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function forceProfile() {
    const name = displayName.trim();
    const bioTrim = bio.trim();
    const nameChanged = name !== draft.displayName;
    const bioChanged = bioTrim !== draft.bio;

    if (!nameChanged && !bioChanged) {
      setError("No changes to apply");
      return;
    }
    if (!name) {
      setError("Display name required");
      return;
    }

    if (nameChanged) {
      const ok = await moderate(
        { type: "force_name", displayName: name, notify: notifyUser },
        "Name updated"
      );
      if (!ok) return;
    }
    if (bioChanged) {
      await moderate({ type: "force_bio", bio: bioTrim, notify: notifyUser }, "Bio updated");
    }
  }

  async function patchSettings(patch: Partial<AccountSettings>) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(draft.username)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: patch }),
      });
      const data = (await res.json()) as AccountListItem & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Update failed");
        return;
      }
      setDraft(data);
      onUpdated(data);
      setMessage("Updated");
    } catch {
      setError("Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleBadge(slug: string, has: boolean) {
    setBadgeLoading(slug);
    setError("");
    setMessage("");
    try {
      const url = has
        ? `/api/admin/users/${encodeURIComponent(draft.username)}/badges?slug=${encodeURIComponent(slug)}`
        : `/api/admin/users/${encodeURIComponent(draft.username)}/badges`;
      const response = await fetch(url, {
        method: has ? "DELETE" : "POST",
        headers: has ? undefined : { "Content-Type": "application/json" },
        body: has ? undefined : JSON.stringify({ slug }),
      });
      const data = (await response.json()) as AccountListItem & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Badge update failed");
        return;
      }
      setDraft(data);
      onUpdated(data);
      setMessage(has ? "Badge removed" : "Badge granted");
    } catch {
      setError("Badge update failed");
    } finally {
      setBadgeLoading(null);
    }
  }

  async function forceVerify() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(draft.username)}/verify-email`,
        { method: "POST", credentials: "same-origin" }
      );
      const data = (await res.json()) as AccountListItem & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Verify failed");
        return;
      }
      setDraft(data);
      onUpdated(data);
      setMessage("Email force-verified");
    } catch {
      setError("Verify failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 4000);
      return;
    }
    setDeleteLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(draft.username)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Delete failed");
        return;
      }
      onDeleted();
    } catch {
      setError("Delete failed");
    } finally {
      setDeleteLoading(false);
      setDeleteConfirm(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {roles.map((role) => (
          <RolePill key={role} role={role} />
        ))}
        {!draft.emailVerified && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-500/35 bg-amber-500/10 text-amber-300">
            Unverified
          </span>
        )}
        {draft.bannedAt && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-red-500/35 bg-red-500/10 text-red-300">
            Banned
          </span>
        )}
        {draft.warningCount > 0 && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-orange-500/35 bg-orange-500/10 text-orange-300">
            {draft.warningCount} warn{draft.warningCount === 1 ? "" : "s"}
          </span>
        )}
        <Link
          href={`/u/${draft.username}`}
          target="_blank"
          className="admin-btn admin-btn--xs admin-btn--ghost ml-auto"
        >
          <ExternalLink className="w-3 h-3" />
          View profile
        </Link>
      </div>

      <div className="flex gap-1 border-b border-white/[0.08] pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors ${
              tab === t.id
                ? "bg-white/10 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="space-y-4">
          <p className="text-[11px] text-amber-200/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            Force-changing name or bio notifies the user by default.
          </p>
          <label className="admin-label" htmlFor="admin-display-name">
            Display name
          </label>
          <input
            id="admin-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="admin-input w-full mb-3"
            maxLength={64}
          />
          <label className="admin-label" htmlFor="admin-bio">
            Bio / description
          </label>
          <textarea
            id="admin-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="admin-input w-full mb-3 min-h-[80px] resize-y"
            maxLength={500}
          />
          <label className="flex items-center gap-2 text-xs text-gray-400 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyUser}
              onChange={(e) => setNotifyUser(e.target.checked)}
              className="accent-white"
            />
            Notify user about forced changes
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void forceProfile()}
            className="admin-btn admin-btn--sm admin-btn--primary"
          >
            {saving ? "Saving…" : "Force save profile"}
          </button>

          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 mt-4">
            Privacy
          </p>
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3">
            <SettingToggle
              label="Public profile"
              description="Others can view their page"
              checked={draft.settings.profilePublic}
              disabled={saving}
              onChange={(v) => void patchSettings({ profilePublic: v })}
            />
            <SettingToggle
              label="Show badges"
              description="Badges visible on profile"
              checked={draft.settings.showBadges}
              disabled={saving}
              onChange={(v) => void patchSettings({ showBadges: v })}
            />
            <SettingToggle
              label="Show comment history"
              description="Others see their comments"
              checked={draft.settings.showCommentHistory}
              disabled={saving}
              onChange={(v) => void patchSettings({ showCommentHistory: v })}
            />
          </div>
          <p className="text-[11px] text-gray-500">
            {draft.commentCount} comments · joined {fmtDate(draft.createdAt)}
          </p>
        </div>
      )}

      {tab === "badges" && (
        <section>
          <p className="text-[11px] text-gray-500 mb-3">Toggle badges to grant or revoke roles.</p>
          <div className="flex flex-wrap gap-2">
            {grantableSlugs.map((slug) => {
              const def = BADGE_BY_SLUG[slug];
              if (!def) return null;
              const active = draft.badgeSlugs.includes(slug);
              const loading = badgeLoading === slug;
              return (
                <button
                  key={slug}
                  type="button"
                  disabled={!!badgeLoading}
                  onClick={() => void toggleBadge(slug, active)}
                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
                    active
                      ? "border-sky-500/45 bg-sky-500/15 text-sky-200"
                      : "border-white/12 bg-white/[0.03] text-gray-400 hover:text-gray-200 hover:border-white/25"
                  } ${loading ? "opacity-50" : ""}`}
                  title={def.description}
                >
                  {def.label}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {tab === "moderation" && (
        <div className="space-y-5">
          {draft.bannedAt ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
              <p className="text-sm text-red-200 font-medium">Account suspended</p>
              {draft.banReason && (
                <p className="text-xs text-red-200/70 mt-1">{draft.banReason}</p>
              )}
              <p className="text-[10px] text-red-200/50 mt-1">
                Since {fmtDate(draft.bannedAt)}
                {draft.bannedUntil && ` · until ${fmtDate(draft.bannedUntil)}`}
              </p>
              {draft.bannedBy && (
                <p className="text-[10px] text-red-200/50">By @{draft.bannedBy.username}</p>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={() => void moderate({ type: "unban" }, "Ban lifted")}
                className="admin-btn admin-btn--sm admin-btn--ghost mt-3"
              >
                Lift ban
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
              <p className="text-sm text-gray-200 font-medium">Ban user</p>
              <input
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Reason (optional, shown to user)"
                className="admin-input w-full"
                maxLength={200}
              />
              <label className="admin-label" htmlFor="ban-until">
                Ban expires (optional)
              </label>
              <input
                id="ban-until"
                type="datetime-local"
                value={banUntil}
                onChange={(e) => setBanUntil(e.target.value)}
                className="admin-input w-full"
              />
              <button
                type="button"
                disabled={saving}
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
                className="admin-btn admin-btn--sm admin-btn--danger"
              >
                Ban account
              </button>
            </div>
          )}

          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
            <p className="text-sm text-gray-200 font-medium">Send warning</p>
            <textarea
              value={warnMessage}
              onChange={(e) => setWarnMessage(e.target.value)}
              placeholder="Warning message — user gets notification"
              className="admin-input w-full min-h-[72px] resize-y"
              maxLength={500}
            />
            <button
              type="button"
              disabled={saving || !warnMessage.trim()}
              onClick={async () => {
                const ok = await moderate(
                  { type: "warn", message: warnMessage.trim() },
                  "Warning sent"
                );
                if (ok) setWarnMessage("");
              }}
              className="admin-btn admin-btn--sm admin-btn--primary"
            >
              Send warning
            </button>
          </div>
        </div>
      )}

      {tab === "account" && (
        <div className="space-y-5">
          {!draft.emailVerified && (
            <div className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-4 py-3">
              <p className="text-sm text-sky-100 mb-2">Email not verified</p>
              <button
                type="button"
                disabled={saving}
                onClick={() => void forceVerify()}
                className="admin-btn admin-btn--sm admin-btn--primary"
              >
                Force verify email
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-white/[0.08]">
            <p className="text-[11px] text-gray-500 mb-3">
              Deletes account, comments, badges, and sessions.
            </p>
            <button
              type="button"
              onClick={() => void deleteUser()}
              disabled={deleteLoading}
              className={`admin-btn admin-btn--sm ${deleteConfirm ? "admin-btn--danger" : "admin-btn--ghost"}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleteLoading ? "Deleting…" : deleteConfirm ? "Confirm delete" : "Delete user"}
            </button>
          </div>
        </div>
      )}

      {(error || message) && (
        <p className={`text-[11px] ${error ? "text-red-400" : "text-gray-500"}`}>{error || message}</p>
      )}
    </div>
  );
}

export default function UserManagement() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AccountListItem | null>(null);
  const [grantableSlugs, setGrantableSlugs] = useState<string[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async (p: number, q: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) {
        setError("Could not load users");
        setData(null);
        return;
      }
      const json = (await res.json()) as ListResponse;
      setData(json);
      setSelected((prev) => {
        if (!prev) return null;
        return json.users.find((u) => u.username === prev.username) ?? prev;
      });
    } catch {
      setError("Could not load users");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch("/api/accounts/permissions", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { grantableBadgeSlugs?: string[] } | null) => {
        setGrantableSlugs(data?.grantableBadgeSlugs ?? []);
      })
      .catch(() => setGrantableSlugs([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    void load(page, query);
  }, [load, page, query]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function handleUpdated(user: AccountListItem) {
    setData((prev) =>
      prev
        ? { ...prev, users: prev.users.map((u) => (u.username === user.username ? user : u)) }
        : prev
    );
    setSelected(user);
  }

  function handleDeleted() {
    setSelected(null);
    void load(page, query);
  }

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search username or display name…"
          className="admin-input w-full pl-9"
        />
      </div>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      {loading && !data ? (
        <div className="glass rounded-xl p-12 text-center text-sm text-gray-500">Loading users…</div>
      ) : !data || data.users.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center text-sm text-gray-500">
          {query ? "No users match your search." : "No accounts yet."}
        </div>
      ) : (
        <>
          <div className="glass rounded-xl overflow-hidden">
            <div className="hidden md:grid grid-cols-[1fr_110px_1fr_90px_40px] gap-4 px-5 py-3 border-b border-white/[0.08]">
              {["User", "Role", "Status", "Joined", ""].map((h) => (
                <p key={h} className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  {h}
                </p>
              ))}
            </div>

            {data.users.map((user, i) => {
              const roles = roleLabelsForUser(user.username, user.badgeSlugs);
              return (
                <div
                  key={user.username}
                  className={`px-4 md:px-5 py-4 hover:bg-white/[0.03] transition-colors ${
                    i < data.users.length - 1 ? "border-b border-white/[0.06]" : ""
                  }`}
                >
                  <div className="md:grid md:grid-cols-[1fr_110px_1fr_90px_40px] md:gap-4 md:items-center">
                    <div className="min-w-0 mb-2 md:mb-0">
                      <p className="text-sm font-medium text-white truncate">{user.displayName}</p>
                      <p className="text-[11px] text-gray-500 font-mono">@{user.username}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2 md:mb-0">
                      {roles.map((r) => (
                        <RolePill key={r} role={r} />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2 md:mb-0 min-w-0">
                      {user.bannedAt && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border border-red-500/35 text-red-300">
                          Banned
                        </span>
                      )}
                      {!user.emailVerified && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border border-amber-500/35 text-amber-300">
                          Unverified
                        </span>
                      )}
                      {user.warningCount > 0 && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border border-orange-500/35 text-orange-300">
                          {user.warningCount}w
                        </span>
                      )}
                      {!user.bannedAt && user.emailVerified && user.warningCount === 0 && (
                        <span className="text-[11px] text-gray-600">—</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono mb-2 md:mb-0">
                      {fmtDate(user.createdAt)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelected(user)}
                      className="admin-btn admin-btn--icon admin-btn--ghost"
                      title="Edit user"
                      aria-label={`Edit ${user.username}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 mt-4">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="admin-btn admin-btn--sm admin-btn--ghost"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-[11px] text-gray-500">
              Page {data.page} of {totalPages} · {data.total} users
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="admin-btn admin-btn--sm admin-btn--ghost"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent
          showCloseButton
          overlayClassName="bg-black/75 backdrop-blur-sm"
          className="sm:max-w-2xl max-h-[min(90vh,720px)] overflow-y-auto bg-[#111] border border-white/10 text-white ring-0 shadow-2xl p-5 gap-0"
        >
          {selected && (
            <>
              <DialogHeader className="mb-4 pr-8">
                <DialogTitle className="text-lg font-semibold text-white">
                  {selected.displayName}
                </DialogTitle>
                <DialogDescription className="text-gray-500 font-mono text-xs">
                  @{selected.username}
                </DialogDescription>
              </DialogHeader>
              <UserEditor
                user={selected}
                grantableSlugs={grantableSlugs}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
