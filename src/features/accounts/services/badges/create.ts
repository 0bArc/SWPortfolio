import type { Permission, RoleId } from "@permissions-config";
import type { LucideIcon } from "lucide-react";
import { Award } from "lucide-react";
import type {
  BadgeAwardRules,
  BadgeDef,
  BadgeGroupId,
  BadgeRoleMeta,
  BadgeTone,
  StackPolicy,
} from "./types";

export type ColorPreset =
  | "red"
  | "violet"
  | "sky"
  | "amber"
  | "lime"
  | "cyan"
  | "emerald"
  | "neutral"
  | "white";

export type BadgeColor =
  | ColorPreset
  | { shell: string; icon: string };

const COLOR_PRESETS: Record<ColorPreset, { shell: string; icon: string }> = {
  red: {
    shell: "bg-[#2d1818] border border-red-500/60",
    icon: "text-red-300",
  },
  violet: {
    shell: "bg-[#2a1f3d] border border-violet-500/60",
    icon: "text-violet-300",
  },
  sky: {
    shell: "bg-[#1a2d3d] border border-sky-500/60",
    icon: "text-sky-300",
  },
  amber: {
    shell: "bg-[#2d2a1a] border border-amber-500/55",
    icon: "text-amber-300",
  },
  lime: {
    shell: "bg-[#1f2a1a] border border-lime-500/55",
    icon: "text-lime-300",
  },
  cyan: {
    shell: "bg-[#1a2d33] border border-cyan-500/55",
    icon: "text-cyan-300",
  },
  emerald: {
    shell: "bg-[#1a3328] border border-emerald-500/55",
    icon: "text-emerald-300",
  },
  neutral: {
    shell: "bg-[#2a2a2a] border border-white/35",
    icon: "text-gray-200",
  },
  white: {
    shell: "bg-white/80 border border-white/60",
    icon: "text-black",
  },
};

function resolveColor(color: BadgeColor): { shell: string; iconClass: string } {
  if (typeof color === "string") {
    const preset = COLOR_PRESETS[color];
    return { shell: preset.shell, iconClass: preset.icon };
  }
  return { shell: color.shell, iconClass: color.icon };
}

type Draft = {
  slug: string;
  label: string;
  description: string;
  tone: BadgeTone;
  group: BadgeGroupId;
  order: number;
  stack: StackPolicy;
  award: BadgeAwardRules;
  permissions: Permission[];
  role?: BadgeRoleMeta;
  Icon: LucideIcon;
  shell: string;
  iconClass: string;
};

class BadgeBuilder {
  private draft: Draft;

  constructor(slug: string) {
    this.draft = {
      slug,
      label: slug,
      description: "",
      tone: "neutral",
      group: "community",
      order: 50,
      stack: { kind: "once" },
      award: {
        auto: false,
        staffAwardable: true,
        hidden: false,
        grantPermission: "badges:award",
      },
      permissions: [],
      Icon: Award,
      shell: COLOR_PRESETS.neutral.shell,
      iconClass: COLOR_PRESETS.neutral.icon,
    };
  }

  /** Display name */
  name(label: string): this {
    this.draft.label = label;
    return this;
  }

  description(text: string): this {
    this.draft.description = text;
    return this;
  }

  color(color: BadgeColor): this {
    const resolved = resolveColor(color);
    this.draft.shell = resolved.shell;
    this.draft.iconClass = resolved.iconClass;
    return this;
  }

  icon(Icon: LucideIcon): this {
    this.draft.Icon = Icon;
    return this;
  }

  group(group: BadgeGroupId): this {
    this.draft.group = group;
    return this;
  }

  order(n: number): this {
    this.draft.order = n;
    return this;
  }

  tone(tone: BadgeTone): this {
    this.draft.tone = tone;
    return this;
  }

  /** Permissions granted to badge holder */
  permissions(...perms: Permission[]): this {
    this.draft.permissions = perms;
    return this;
  }

  /** Staff role — sets hierarchy rank */
  role(id: RoleId, rank: number): this {
    this.draft.role = { id, rank };
    this.draft.tone = "staff";
    this.draft.group = "roles";
    return this;
  }

  /** Permission needed to manually grant this badge */
  awardableBy(permission: Permission): this {
    this.draft.award.grantPermission = permission;
    return this;
  }

  /** System auto-awards (signup, milestones) */
  autoGrant(): this {
    this.draft.award.auto = true;
    return this;
  }

  /** Hide from staff award UI (legacy slugs) */
  hidden(): this {
    this.draft.award.hidden = true;
    this.draft.award.staffAwardable = false;
    return this;
  }

  /** Only system grants — not in staff panel */
  autoOnly(): this {
    this.draft.award.auto = true;
    this.draft.award.staffAwardable = false;
    return this;
  }

  /** Also show in staff panel (use with autoGrant for manual override) */
  staffAwardable(value = true): this {
    this.draft.award.staffAwardable = value;
    return this;
  }

  /**
   * Stacking when awarded multiple times.
   * `false` = once ever · `true` = unlimited · `"yearly"` = once per calendar year
   */
  canBeAwardedAgain(mode: boolean | "yearly"): this {
    if (mode === "yearly") this.draft.stack = { kind: "year" };
    else if (mode === true) this.draft.stack = { kind: "unlimited" };
    else this.draft.stack = { kind: "once" };
    return this;
  }

  build(): BadgeDef {
    const d = this.draft;
    return {
      slug: d.slug,
      label: d.label,
      description: d.description,
      tone: d.tone,
      group: d.group,
      order: d.order,
      stack: d.stack,
      award: { ...d.award },
      permissions: [...d.permissions],
      role: d.role ? { ...d.role } : undefined,
      visual: {
        Icon: d.Icon,
        shell: d.shell,
        iconClass: d.iconClass,
      },
    };
  }
}

/** Fluent badge definitions — `badgeCreator.create("slug").name("…").color("red").build()` */
export const badgeCreator = {
  create(slug: string): BadgeBuilder {
    return new BadgeBuilder(slug);
  },
};
