import Link from "next/link";
import type { ReactNode } from "react";
import type { AccountBadge } from "@/database/schema";
import AccountAvatar from "@/features/accounts/components/AccountAvatar";
import PostAuthorBadge from "@/features/blog/components/PostAuthorBadge";
import { slugifyAuthor } from "@/features/blog/utils/authors";

const AVATAR_SIZE = 42;

interface Props {
  name: string;
  username?: string | null;
  icon?: string | null;
  badge?: AccountBadge | null;
  tags?: ReactNode;
}

export default function PostAuthor({ name, username, icon, badge, tags }: Props) {
  const avatarUsername = username ?? slugifyAuthor(name);
  const avatar = (
    <AccountAvatar
      username={avatarUsername}
      displayName={name}
      icon={icon ?? null}
      size={AVATAR_SIZE}
    />
  );

  const nameEl = username ? (
    <Link
      href={`/u/${username}`}
      className="text-[15px] font-semibold leading-none name-shimmer hover:text-white transition-colors"
    >
      {name}
    </Link>
  ) : (
    <span className="text-[15px] font-semibold leading-none name-shimmer">{name}</span>
  );

  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0">
        {username ? <Link href={`/u/${username}`}>{avatar}</Link> : avatar}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          {nameEl}
          {tags && (
            <div className="[&_a]:text-[11px] [&_span]:text-[11px] [&_a]:px-2 [&_a]:py-0.5 [&_span]:px-2 [&_span]:py-0.5">
              {tags}
            </div>
          )}
        </div>
        {badge && <PostAuthorBadge badge={badge} />}
      </div>
    </div>
  );
}
