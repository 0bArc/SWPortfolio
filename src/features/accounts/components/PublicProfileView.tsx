import Link from "next/link";
import type { AccountBadge, AccountPublic } from "@/database/schema";
import type { CommentHistoryItem } from "@/database/comments";
import AccountAvatar from "./AccountAvatar";
import ProfileNameHeader from "./ProfileNameHeader";
import ProfileTabs from "./ProfileTabs";

type Props = {
  account: AccountPublic;
  joined: string;
  badges: AccountBadge[];
  history: CommentHistoryItem[];
  showBadgesPublic: boolean;
  showHistoryPublic: boolean;
  featuredBadge: AccountBadge | null;
};

export default function PublicProfileView({
  account,
  joined,
  badges,
  history,
  showBadgesPublic,
  showHistoryPublic,
  featuredBadge,
}: Props) {

  return (
    <>
      <div className="flex items-start gap-6">
        <AccountAvatar
          username={account.username}
          displayName={account.displayName}
          icon={account.icon}
          size={80}
        />
        <div className="min-w-0 flex-1 pt-1">
          <ProfileNameHeader
            badge={featuredBadge}
            name={
              <h1 className="text-2xl sm:text-[1.65rem] font-bold tracking-tight text-white leading-tight truncate">
                {account.displayName}
              </h1>
            }
          />
          <p className="text-sm text-gray-400 mt-1.5">@{account.username}</p>
          <p className="text-[13px] text-gray-500 mt-1">Joined {joined}</p>
        </div>
      </div>

      <ProfileTabs
        badges={badges}
        history={history}
        isOwner={false}
        showBadgesPublic={showBadgesPublic}
        showHistoryPublic={showHistoryPublic}
        bio={account.bio}
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
