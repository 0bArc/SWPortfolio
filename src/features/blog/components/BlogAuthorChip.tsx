import Link from "next/link";
import AccountAvatar from "@/features/accounts/components/AccountAvatar";
import { slugifyAuthor } from "@/features/blog/utils/authors";

interface Props {
  name: string;
  username?: string | null;
  icon?: string | null;
  href?: string;
  active?: boolean;
  compact?: boolean;
  /** Avoid nested links when chip sits inside another link */
  static?: boolean;
}

export default function BlogAuthorChip({
  name,
  username,
  icon,
  href,
  active = false,
  compact = false,
  static: isStatic = false,
}: Props) {
  const avatarUsername = username ?? slugifyAuthor(name);
  const inner = (
    <>
      <AccountAvatar
        username={avatarUsername}
        displayName={name}
        icon={icon ?? null}
        size={compact ? 18 : 28}
      />
      <span className={`truncate ${compact ? "normal-case" : ""}`}>{name}</span>
    </>
  );

  const className = `inline-flex items-center gap-2 rounded-lg transition-all ${
    compact
      ? "text-[11px] text-gray-500 normal-case font-medium"
      : "px-3 py-2 text-sm font-medium normal-case"
  } ${
    active
      ? "bg-white/[0.08] border border-white/10 text-white"
      : compact
        ? "text-gray-500 group-hover:text-gray-300"
        : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent"
  }`;

  if (!isStatic && href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  if (!isStatic && username) {
    return (
      <Link href={`/u/${username}`} className={className}>
        {inner}
      </Link>
    );
  }

  return <span className={className}>{inner}</span>;
}
