"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AccountBadge, AccountSettings } from "@/database/schema";
import type { CommentHistoryItem } from "@/database/comments";
import { useAccountSession } from "@/providers/AccountSessionProvider";
import EditableAccountAvatar from "./EditableAccountAvatar";
import FeaturedBadgePicker from "./FeaturedBadgePicker";
import ProfileNameHeader from "./ProfileNameHeader";
import ProfileTabs from "./ProfileTabs";
import { resolveFeaturedBadge } from "@/features/accounts/services/badges/catalog";
import { onNetworkRefresh } from "@/lib/network/synchronize";

type SessionAccount = { username: string; displayName: string; icon: string | null };

type PanelData = {
  settings: AccountSettings;
  badges: AccountBadge[];
  history: CommentHistoryItem[];
  icon: string | null;
  iconPending: string | null;
  pendingReview: boolean;
  displayName: string;
  username: string;
  bio: string;
};

type Props = {
  account: {
    username: string;
    displayName: string;
    icon: string | null;
    bio?: string;
  };
  joined: string;
  badges: AccountBadge[];
  history: CommentHistoryItem[];
  showBadgesPublic: boolean;
  showHistoryPublic: boolean;
};

function SettingRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-2 border-b border-white/[0.06] last:border-0 cursor-pointer">
      <span className="min-w-0">
        <span className="block text-sm text-gray-200">{label}</span>
        <span className="block text-xs text-gray-400 leading-snug">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-white shrink-0"
      />
    </label>
  );
}

export default function AccountProfilePanel({
  account: initialAccount,
  joined,
  badges: initialBadges,
  history: initialHistory,
  showBadgesPublic,
  showHistoryPublic,
}: Props) {
  const router = useRouter();
  const { account: sessionAccount, setAccount } = useAccountSession();
  const [data, setData] = useState<PanelData | null>(null);
  const [saving, setSaving] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [icon, setIcon] = useState<string | null>(initialAccount.icon);
  const [iconPending, setIconPending] = useState<string | null>(null);
  const [pendingReview, setPendingReview] = useState(false);
  const [displayName, setDisplayName] = useState(initialAccount.displayName);
  const [savedDisplayName, setSavedDisplayName] = useState(initialAccount.displayName);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(initialAccount.displayName);
  const [nameError, setNameError] = useState("");
  const [username, setUsername] = useState(initialAccount.username);
  const [iconLoading, setIconLoading] = useState(false);
  const [iconError, setIconError] = useState("");
  const [bio, setBio] = useState(initialAccount.bio ?? "");

  const load = useCallback(async () => {
    const res = await fetch("/api/accounts/settings", { credentials: "same-origin" });
    if (!res.ok) return;
    const json = (await res.json()) as PanelData;
    setData(json);
    setIcon(json.icon);
    setIconPending(json.iconPending);
    setPendingReview(json.pendingReview);
    setDisplayName(json.displayName);
    setSavedDisplayName(json.displayName);
    setDraftName(json.displayName);
    setUsername(json.username);
    setBio(json.bio ?? "");
  }, []);

  const saveBio = useCallback(async (nextBio: string) => {
    const res = await fetch("/api/accounts/settings", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio: nextBio }),
    });
    const json = (await res.json()) as { error?: string; bio?: string };
    if (!res.ok) throw new Error(json.error ?? "Could not save");
    setBio(json.bio ?? nextBio);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const offProfile = onNetworkRefresh("profile", () => void load());
    const offSession = onNetworkRefresh("session", () => void load());
    return () => {
      offProfile();
      offSession();
    };
  }, [load]);

  useEffect(() => {
    if (!sessionAccount) return;
    setIcon(sessionAccount.icon);
    setIconPending(sessionAccount.iconPending ?? null);
    setPendingReview(Boolean(sessionAccount.iconPending));
  }, [sessionAccount?.icon, sessionAccount?.iconPending, sessionAccount]);

  const settings = data?.settings;
  const badges = data?.badges ?? initialBadges;
  const history = data?.history ?? initialHistory;
  const nameDirty = draftName.trim() !== savedDisplayName;

  async function patchSettings(patch: Partial<AccountSettings>) {
    if (!settings) return;
    setSaving(true);
    setMessage("");
    const optimistic = { ...settings, ...patch };
    setData((d) => (d ? { ...d, settings: optimistic } : d));
    try {
      const res = await fetch("/api/accounts/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const json = (await res.json()) as { settings: AccountSettings };
        setData((d) => (d ? { ...d, settings: json.settings } : d));
        setMessage("Saved");
      } else {
        setData((d) => (d ? { ...d, settings } : d));
        setMessage("Could not save");
      }
    } catch {
      setData((d) => (d ? { ...d, settings } : d));
      setMessage("Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function saveDisplayName() {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setNameError("Name cannot be empty");
      return;
    }
    setNameError("");
    setNameSaving(true);
    try {
      const res = await fetch("/api/accounts/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ displayName: trimmed }),
      });
      const json = (await res.json()) as { error?: string; displayName?: string; account?: SessionAccount };
      if (res.ok && json.displayName) {
        setDisplayName(json.displayName);
        setSavedDisplayName(json.displayName);
        setDraftName(json.displayName);
        setEditingName(false);
        if (json.account) setAccount(json.account);
        setMessage("Display name saved");
        router.refresh();
      } else {
        setNameError(json.error ?? "Could not save name");
      }
    } catch {
      setNameError("Could not save name");
    } finally {
      setNameSaving(false);
    }
  }

  function revertDisplayName() {
    setDraftName(savedDisplayName);
    setDisplayName(savedDisplayName);
    setNameError("");
    setEditingName(false);
  }

  async function logout() {
    setLogoutLoading(true);
    try {
      await fetch("/api/accounts/logout", { method: "POST", credentials: "same-origin" });
      setAccount(null);
      router.push("/");
      router.refresh();
    } finally {
      setLogoutLoading(false);
    }
  }

  async function deleteAccount() {
    setDeleteError("");
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/accounts/settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password: deletePassword, confirm: deleteConfirm }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setAccount(null);
        router.push("/");
        router.refresh();
      } else {
        setDeleteError(json.error ?? "Could not delete account");
      }
    } catch {
      setDeleteError("Something went wrong");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function uploadIcon(file: File) {
    setIconError("");
    setIconLoading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/accounts/icon", {
        method: "POST",
        credentials: "same-origin",
        body: form,
      });
      const json = (await res.json()) as {
        error?: string;
        icon?: string | null;
        iconPending?: string | null;
        pendingReview?: boolean;
        message?: string;
        account?: SessionAccount;
      };
      if (res.ok) {
        setIcon(json.icon ?? json.account?.icon ?? null);
        setIconPending(json.iconPending ?? null);
        setPendingReview(json.pendingReview ?? false);
        if (json.account) setAccount(json.account);
        setMessage(json.message ?? "Photo updated");
        router.refresh();
      } else {
        setIconError(json.error ?? "Upload failed");
      }
    } catch {
      setIconError("Upload failed");
    } finally {
      setIconLoading(false);
    }
  }

  async function removeIcon() {
    setIconError("");
    setIconLoading(true);
    try {
      const res = await fetch("/api/accounts/icon", {
        method: "DELETE",
        credentials: "same-origin",
      });
      const json = (await res.json()) as {
        error?: string;
        account?: SessionAccount;
        iconPending?: string | null;
        pendingReview?: boolean;
      };
      if (res.ok && json.account) {
        setIcon(null);
        setIconPending(json.iconPending ?? null);
        setPendingReview(json.pendingReview ?? false);
        setAccount(json.account);
        setMessage("Photo removed");
        router.refresh();
      } else {
        setIconError(json.error ?? "Could not remove photo");
      }
    } catch {
      setIconError("Could not remove photo");
    } finally {
      setIconLoading(false);
    }
  }

  const mainBadge = resolveFeaturedBadge(badges, settings?.featuredBadgeSlug ?? null);

  const settingsPanel = settings ? (
    <div>
      <SettingRow
        label="Public profile"
        description="Others can view your page"
        checked={settings.profilePublic}
        onChange={(v) => void patchSettings({ profilePublic: v })}
      />
      <SettingRow
        label="Show badges"
        description="Badges on your profile"
        checked={settings.showBadges}
        onChange={(v) => void patchSettings({ showBadges: v })}
      />
      <SettingRow
        label="Show comment history"
        description="Others see your comments"
        checked={settings.showCommentHistory}
        onChange={(v) => void patchSettings({ showCommentHistory: v })}
      />
      <FeaturedBadgePicker
        badges={badges}
        value={settings.featuredBadgeSlug}
        disabled={saving}
        onChange={(slug) => void patchSettings({ featuredBadgeSlug: slug })}
      />
      {message && <p className="text-[10px] text-gray-500 mt-2">{saving ? "Saving…" : message}</p>}

      <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void logout()}
          disabled={logoutLoading}
          className="h-7 px-2.5 rounded-md border border-white/10 text-xs text-gray-400 hover:text-white disabled:opacity-50"
        >
          {logoutLoading ? "Signing out…" : "Sign out"}
        </button>
        <button
          type="button"
          onClick={() => setDeleteOpen((v) => !v)}
          className="h-7 px-2.5 rounded-md border border-red-500/20 text-xs text-red-400/80 hover:text-red-300"
        >
          Delete account
        </button>
      </div>

      {deleteOpen && (
        <div className="mt-3 rounded-lg border border-red-500/25 bg-red-500/[0.06] p-3 space-y-2">
          <p className="text-xs text-red-200">Permanently deletes account, comments, badges.</p>
          <input
            type="password"
            placeholder="Password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-sm text-white"
            autoComplete="current-password"
          />
          <input
            type="text"
            placeholder="Type DELETE"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-sm text-white"
          />
          {deleteError && <p className="text-[11px] text-red-300">{deleteError}</p>}
          <button
            type="button"
            disabled={deleteLoading || deleteConfirm !== "DELETE" || !deletePassword}
            onClick={() => void deleteAccount()}
            className="h-8 px-3 rounded-md bg-red-600/80 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-50"
          >
            {deleteLoading ? "Deleting…" : "Delete my account"}
          </button>
        </div>
      )}
    </div>
  ) : (
    <div className="h-16 animate-pulse rounded-lg bg-white/[0.03]" />
  );

  return (
    <>
      <div className="flex items-start gap-6">
        <EditableAccountAvatar
          username={username}
          displayName={displayName}
          icon={pendingReview ? (iconPending ?? icon) : icon}
          size={80}
          loading={iconLoading}
          pendingReview={pendingReview}
          onFile={(file) => void uploadIcon(file)}
        />
        <div className="min-w-0 flex-1 pt-1">
          {pendingReview && (
            <p className="text-[11px] text-amber-300/90 mb-2">
              Photo pending review — only you see this preview until an admin approves it.
            </p>
          )}
          {editingName ? (
            <div className="space-y-2">
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                maxLength={64}
                autoFocus
                className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-xl font-bold text-white outline-none focus:border-white/30"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={nameSaving || !nameDirty || !draftName.trim()}
                  onClick={() => void saveDisplayName()}
                  className="h-7 px-2.5 rounded-md bg-white text-black text-xs font-semibold hover:bg-gray-200 disabled:opacity-50"
                >
                  {nameSaving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  disabled={nameSaving}
                  onClick={revertDisplayName}
                  className="h-7 px-2.5 rounded-md border border-white/10 text-xs text-gray-400 hover:text-white disabled:opacity-50"
                >
                  Revert
                </button>
              </div>
            </div>
          ) : (
            <ProfileNameHeader
              badge={mainBadge}
              name={
                <button
                  type="button"
                  onClick={() => {
                    setDraftName(displayName);
                    setEditingName(true);
                    setNameError("");
                  }}
                  className="text-left text-2xl sm:text-[1.65rem] font-bold tracking-tight text-white hover:text-gray-200 transition-colors leading-tight truncate max-w-full"
                  title="Click to edit display name"
                >
                  {displayName}
                </button>
              }
            />
          )}
          <p className="text-sm text-gray-400 mt-1.5">@{username}</p>
          <p className="text-[13px] text-gray-500 mt-1">Joined {joined}</p>
          {icon && !editingName && (
            <button
              type="button"
              disabled={iconLoading}
              onClick={() => void removeIcon()}
              className="text-xs text-gray-400 hover:text-gray-200 mt-1 transition-colors disabled:opacity-50"
            >
              Remove photo
            </button>
          )}
          {(iconError || nameError) && (
            <p className="text-[11px] text-red-400 mt-1">{nameError || iconError}</p>
          )}
        </div>
      </div>

      <ProfileTabs
        badges={badges}
        history={history}
        isOwner
        showBadgesPublic={showBadgesPublic}
        showHistoryPublic={showHistoryPublic}
        bio={bio}
        onSaveBio={saveBio}
        badgeLayout={
          settings
            ? { badgeOrder: settings.badgeOrder, hiddenBadgeSlugs: settings.hiddenBadgeSlugs }
            : undefined
        }
        badgeLayoutSaving={saving}
        onBadgeLayoutChange={(patch) => void patchSettings(patch)}
        settingsContent={settingsPanel}
        profileFooter={
          <Link
            href="/blog"
            className="inline-block text-sm text-gray-400 hover:text-white underline-offset-2 hover:underline"
          >
            Browse posts
          </Link>
        }
      />
    </>
  );
}
