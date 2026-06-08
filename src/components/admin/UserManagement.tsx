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
import type { AccountListItem, AccountSettings } from "@/db/schema";
import { BADGE_DEFS } from "@/lib/accounts/badges";
import { roleLabelsForUser } from "@/lib/accounts/roles";
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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const ROLE_STYLES: Record<string, string> = {
  Admin: "bg-violet-500/15 text-violet-300 border-violet-500/35",
  Developer: "bg-sky-500/15 text-sky-300 border-sky-500/35",
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
  onUpdated,
  onDeleted,
}: {
  user: AccountListItem;
  onUpdated: (u: AccountListItem) => void;
  onDeleted: () => void;
}) {
  const [draft, setDraft] = useState(user);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [saving, setSaving] = useState(false);
  const [badgeLoading, setBadgeLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDraft(user);
    setDisplayName(user.displayName);
    setError("");
    setMessage("");
    setDeleteConfirm(false);
  }, [user]);

  const roles = roleLabelsForUser(draft.username, draft.badgeSlugs);
  const nameDirty = displayName.trim() !== draft.displayName;

  async function saveProfile() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(draft.username)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      const data = (await res.json()) as AccountListItem & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      setDraft(data);
      setDisplayName(data.displayName);
      onUpdated(data);
      setMessage("Saved");
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {roles.map((role) => (
          <RolePill key={role} role={role} />
        ))}
        <Link
          href={`/u/${draft.username}`}
          target="_blank"
          className="admin-btn admin-btn--xs admin-btn--ghost ml-auto"
        >
          <ExternalLink className="w-3 h-3" />
          View profile
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Profile</p>
          <label className="admin-label" htmlFor="admin-display-name">
            Display name
          </label>
          <input
            id="admin-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="admin-input w-full mb-2"
            maxLength={64}
          />
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <button
              type="button"
              disabled={saving || !nameDirty || !displayName.trim()}
              onClick={() => void saveProfile()}
              className="admin-btn admin-btn--sm admin-btn--primary"
            >
              {saving ? "Saving…" : "Save name"}
            </button>
            <span className="text-[11px] text-gray-500">
              {draft.commentCount} comments · joined {fmtDate(draft.createdAt)}
            </span>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 mt-3">Privacy</p>
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
        </section>

        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Badges & permissions</p>
          <p className="text-[11px] text-gray-500 mb-3">Toggle badges to grant or revoke roles.</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(BADGE_DEFS).map(([slug, def]) => {
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
      </div>

      {(error || message) && (
        <p className={`text-[11px] ${error ? "text-red-400" : "text-gray-500"}`}>{error || message}</p>
      )}

      <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-[11px] text-gray-500">Deletes account, comments, badges, and sessions.</p>
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
  );
}

export default function UserManagement() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AccountListItem | null>(null);
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
        ? {
            ...prev,
            users: prev.users.map((u) => (u.username === user.username ? user : u)),
          }
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
              {["User", "Role", "Badges", "Joined", ""].map((h) => (
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
                      {user.badgeSlugs.length > 0 ? (
                        user.badgeSlugs.map((slug) => (
                          <span
                            key={slug}
                            className="text-[9px] font-medium px-1.5 py-0.5 rounded border border-white/12 bg-white/[0.04] text-gray-300"
                          >
                            {BADGE_DEFS[slug]?.label ?? slug}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-gray-600">—</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono mb-2 md:mb-0">{fmtDate(user.createdAt)}</p>
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
              <UserEditor user={selected} onUpdated={handleUpdated} onDeleted={handleDeleted} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
