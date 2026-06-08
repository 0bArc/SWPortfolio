import Link from "next/link";
import { cn } from "@/lib/utils";

export type BlogButtonColor = "white" | "black";
export type BlogButtonPosition = "left" | "center" | "right";

export interface BlogButtonProps {
  href: string;
  text: string;
  color?: BlogButtonColor;
  position?: BlogButtonPosition;
  className?: string;
}

/** Square CTA button for blog posts — matches markdown `![button]…` output. */
export default function BlogButton({
  href,
  text,
  color = "white",
  position = "center",
  className,
}: BlogButtonProps) {
  const btn = cn(
    "blog-btn",
    color === "black" ? "blog-btn--black" : "blog-btn--white",
    className
  );

  return (
    <div className={cn("blog-btn-wrap", `blog-btn-wrap--${position}`)}>
      <Link href={href} className={btn} rel="noopener noreferrer" target="_blank">
        {text}
      </Link>
    </div>
  );
}
