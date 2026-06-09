import type { Permission, RoleId } from "@permissions-config";
import type { LucideIcon } from "lucide-react";

export type BadgeTone = "neutral" | "accent" | "staff";
export type BadgeGroupId = "roles" | "community" | "posting" | "recognition";

export type StackPolicy =
  | { kind: "once" }
  | { kind: "year" }
  | { kind: "unlimited" };

/** Who can grant + whether system/staff may award */
export type BadgeAwardRules = {
  /** System auto-awards (signup, comment milestones, etc.) */
  auto: boolean;
  /** Visible in staff / admin award UI */
  staffAwardable: boolean;
  /** Legacy slug — show on profile if granted, hide from award UI */
  hidden: boolean;
  /**
   * Permission required to manually grant.
   * `badges:award` = default community badges
   * `auto` = never manual
   */
  grantPermission: Permission | "badges:award" | "auto";
};

export type BadgeRoleMeta = {
  id: RoleId;
  rank: number;
};

export type BadgeDef = {
  slug: string;
  label: string;
  description: string;
  tone: BadgeTone;
  group: BadgeGroupId;
  order: number;
  stack: StackPolicy;
  award: BadgeAwardRules;
  /** Permissions granted while user holds this badge */
  permissions: Permission[];
  /** Staff hierarchy (founder / admin / dev / mod) */
  role?: BadgeRoleMeta;
  visual: {
    Icon: LucideIcon;
    shell: string;
    iconClass: string;
  };
};
