import Link from "next/link";
import { getTagStyle } from "@/lib/tags/styles";
import { getTagVariant, type TagVariant } from "@/lib/tags/variants";
import StyledTagBadge from "./StyledTagBadge";

const classes: Record<TagVariant, string> = {
  glass:
    "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-gray-300 bg-white/[0.06] border border-white/10 transition-colors hover:text-white",
  rainbow:
    "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white bg-indigo-600",
  hacker:
    "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono badge-hacker",
  purple:
    "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white bg-violet-600",
  blue:
    "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white bg-sky-600",
  fire:
    "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white bg-orange-600",
  cyan:
    "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white bg-cyan-600",
};

interface Props {
  tag: string;
  href?: string;
}

export default async function TagBadge({ tag, href }: Props) {
  const custom = await getTagStyle(tag);
  if (custom) {
    return <StyledTagBadge tag={tag} config={custom.config} href={href} />;
  }

  const variant = getTagVariant(tag);
  const cls = classes[variant];
  const label = variant === "hacker" ? `> ${tag}_` : `#${tag}`;

  if (href) {
    return <Link href={href} className={cls}>{label}</Link>;
  }
  return <span className={cls}>{label}</span>;
}
