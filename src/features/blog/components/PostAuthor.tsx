import Image from "next/image";
import { SITE_OWNER, GITHUB_USER } from "@/lib/env";
import AuthorBadge from "./AuthorBadge";

export default function PostAuthor() {
  return (
    <div className="flex items-center gap-3">
      <Image
        src={`https://github.com/${GITHUB_USER}.png?size=80`}
        alt={SITE_OWNER}
        width={38}
        height={38}
        className="rounded-full border border-white/10 flex-shrink-0"
      />
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold leading-none name-shimmer">{SITE_OWNER}</span>
        <AuthorBadge label="Author" />
      </div>
    </div>
  );
}
