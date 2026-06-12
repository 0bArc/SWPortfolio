import { ALL_PERMISSIONS } from "@permissions-config";
import {
  CalendarCheck,
  Code2,
  Crown,
  Gavel,
  Globe,
  MessageCircle,
  MessagesSquare,
  PenLine,
  Shield,
  ShieldCheck,
  User,
  Terminal
} from "lucide-react";
import { badgeCreator } from "./create";
import type { BadgeDef } from "./types";

/** All site badges — edit here with badgeCreator.create(…) */
export const BADGES: BadgeDef[] = [
  badgeCreator
    .create("root")
    .name("Root")
    .description("R̴̡̒o̶͈̐o̵͕̾̀t̶̖̎")
    .icon(Terminal)
    .color("red")
    .tone("accent")
    .order(5)
    .role("founder", 5)
    .permissions("posts:write")
    .awardableBy("badges:grant:founder")
    .build(),
  badgeCreator
    .create("founder")
    .name("Founder")
    .description("Founded this site")
    .icon(Crown)
    .color("red")
    .order(0)
    .role("founder", 0)
    .permissions(...ALL_PERMISSIONS)
    .awardableBy("badges:grant:founder")
    .build(),

  badgeCreator
    .create("admin")
    .name("Administrator")
    .description("Site administrator")
    .icon(ShieldCheck)
    .color("violet")
    .order(1)
    .role("admin", 1)
    .permissions(
      "admin:panel",
      "admin:users",
      "users:moderate",
      "comments:moderate",
      "badges:award",
      "badges:grant:mod",
      "badges:grant:dev",
      "badges:grant:author"
    )
    .awardableBy("badges:grant:admin")
    .build(),

  badgeCreator
    .create("dev")
    .name("Developer")
    .description("Builds and maintains the site")
    .icon(Code2)
    .color("sky")
    .tone("accent")
    .order(2)
    .role("dev", 2)
    .permissions("admin:panel", "comments:moderate", "badges:award")
    .awardableBy("badges:grant:dev")
    .build(),

  badgeCreator
    .create("mod")
    .name("Moderator")
    .description("Moderates the community")
    .icon(Gavel)
    .color("emerald")
    .order(3)
    .role("mod", 3)
    .permissions("admin:panel", "users:moderate", "comments:moderate", "badges:award")
    .awardableBy("badges:grant:mod")
    .build(),

  badgeCreator
    .create("author")
    .name("Author")
    .description("Writes blog posts")
    .icon(PenLine)
    .color("violet")
    .tone("accent")
    .order(4)
    .role("author", 4)
    .permissions("posts:write")
    .awardableBy("badges:grant:author")
    .build(),

  badgeCreator
    .create("staff")
    .name("Staff (legacy)")
    .description("Renamed to Administrator — kept for old grants")
    .icon(Shield)
    .color("violet")
    .order(1)
    .role("admin", 1)
    .permissions(
      "admin:panel",
      "admin:users",
      "users:moderate",
      "comments:moderate",
      "badges:award",
      "badges:grant:mod",
      "badges:grant:dev"
    )
    .hidden()
    .build(),

  badgeCreator
    .create("developer")
    .name("Developer (legacy)")
    .description("Use Dev badge — kept for old grants")
    .icon(Code2)
    .color("sky")
    .tone("accent")
    .order(2)
    .role("dev", 2)
    .permissions("admin:panel", "comments:moderate", "badges:award")
    .hidden()
    .build(),

  badgeCreator
    .create("stratware")
    .name("Stratware.win")
    .description("Team member of Stratware.win")
    .icon(Globe)
    .color("white")
    .tone("accent")
    .group("community")
    .order(8)
    .build(),

  badgeCreator
    .create("member")
    .name("Member")
    .description("Joined the community")
    .icon(User)
    .color("neutral")
    .group("community")
    .order(5)
    .autoGrant()
    .autoOnly()
    .build(),

  badgeCreator
    .create("annual_member")
    .name("Annual Member")
    .description("Active member for another year")
    .icon(CalendarCheck)
    .color("lime")
    .tone("accent")
    .group("recognition")
    .order(6)
    .canBeAwardedAgain("yearly")
    .autoGrant()
    .staffAwardable()
    .build(),

  badgeCreator
    .create("commenter")
    .name("Commenter")
    .description("Left a comment on a post")
    .icon(MessageCircle)
    .color("cyan")
    .tone("accent")
    .group("posting")
    .order(10)
    .autoGrant()
    .staffAwardable()
    .build(),

  badgeCreator
    .create("conversationalist")
    .name("Conversationalist")
    .description("Left 10 or more comments")
    .icon(MessagesSquare)
    .color("emerald")
    .tone("accent")
    .group("posting")
    .order(11)
    .autoGrant()
    .staffAwardable()
    .build(),
];

export const BADGE_BY_SLUG: Record<string, BadgeDef> = Object.fromEntries(
  BADGES.map((b) => [b.slug, b])
);
