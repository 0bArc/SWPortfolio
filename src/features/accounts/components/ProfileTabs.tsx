"use client";

import { useState } from "react";
import type { AccountBadge } from "@/database/schema";
import type { CommentHistoryItem } from "@/database/comments";
import BadgeGallery from "./BadgeGallery";
import type { AccountSettings } from "@/database/schema";
import EditableProfileBadges from "./EditableProfileBadges";
import ProfileBadges from "./ProfileBadges";
import ProfileDescription from "./ProfileDescription";
import { applyBadgeLayout } from "@/features/accounts/services/badges/display";
import CommentHistoryList from "./CommentHistoryList";

type TabId = "profile" | "history" | "badges" | "settings";

type Props = {
  badges: AccountBadge[];
  history: CommentHistoryItem[];
  isOwner: boolean;
  showBadgesPublic: boolean;
  showHistoryPublic: boolean;
  settingsContent?: React.ReactNode;
  profileFooter?: React.ReactNode;
  bio?: string;
  onSaveBio?: (bio: string) => Promise<void>;
  badgeLayout?: Pick<AccountSettings, "badgeOrder" | "hiddenBadgeSlugs">;
  onBadgeLayoutChange?: (patch: Pick<AccountSettings, "badgeOrder" | "hiddenBadgeSlugs">) => void;
  badgeLayoutSaving?: boolean;
};

export default function ProfileTabs({
  badges,
  history,
  isOwner,
  showBadgesPublic,
  showHistoryPublic,
  settingsContent,
  profileFooter,
  bio = "",
  onSaveBio,
  badgeLayout,
  onBadgeLayoutChange,
  badgeLayoutSaving,
}: Props) {
  const canSeeBadges = isOwner || showBadgesPublic;
  const canSeeHistory = isOwner || showHistoryPublic;
  const displayBadges =
    isOwner && badgeLayout
      ? applyBadgeLayout(badges, badgeLayout, { includeHidden: true })
      : badges;
  const showBadgeSection =
    badges.length > 0 && (isOwner || (canSeeBadges && displayBadges.length > 0));

  const tabs: { id: TabId; label: string }[] = [{ id: "profile", label: "Profile" }];
  if (canSeeHistory) tabs.push({ id: "history", label: "History" });
  if (canSeeBadges && badges.length > 0) tabs.push({ id: "badges", label: "Badges" });
  if (isOwner && settingsContent) tabs.push({ id: "settings", label: "Settings" });

  const [active, setActive] = useState<TabId>("profile");

  const safeActive = tabs.some((t) => t.id === active) ? active : "profile";

  return (
    <div className="mt-6">
      <nav
        className="flex gap-0 border-b border-white/[0.1] overflow-x-auto"
        aria-label="Profile sections"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              safeActive === tab.id
                ? "border-white text-white"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="mt-5">
        {safeActive === "profile" && (
          <div className="space-y-6">
            <ProfileDescription bio={bio} isOwner={isOwner} onSave={onSaveBio} />
            {showBadgeSection && (
              <section>
                <h2 className="text-sm font-semibold text-gray-400 mb-3">Badges</h2>
                {isOwner && badgeLayout && onBadgeLayoutChange ? (
                  <EditableProfileBadges
                    badges={badges}
                    badgeOrder={badgeLayout.badgeOrder}
                    hiddenBadgeSlugs={badgeLayout.hiddenBadgeSlugs}
                    disabled={badgeLayoutSaving}
                    onChange={onBadgeLayoutChange}
                  />
                ) : (
                  <ProfileBadges badges={displayBadges} />
                )}
              </section>
            )}
            {profileFooter}
          </div>
        )}

        {safeActive === "history" && (
          <section>
            {history.length > 0 ? (
              <CommentHistoryList items={history} />
            ) : (
              <p className="text-sm text-gray-500">No comments yet.</p>
            )}
          </section>
        )}

        {safeActive === "badges" && canSeeBadges && (
          <section>
            <BadgeGallery badges={badges} />
          </section>
        )}

        {safeActive === "settings" && isOwner && settingsContent}
      </div>
    </div>
  );
}
