/**
 * Global permission names — what actions exist on the site.
 *
 * Badge roles, colors, grant rules, and per-badge permissions live in:
 *   src/features/accounts/services/badges/definitions.ts
 */

export const PERMISSIONS = {
  "admin:panel": "Open staff panel at /admin",
  "admin:users": "Full user management in /admin/users",
  "users:moderate": "Warn, ban, moderate members in /admin/users",
  "comments:moderate": "Delete comments on posts",
  "badges:award": "Grant community / recognition badges",
  "badges:grant:mod": "Grant Moderator role badge",
  "badges:grant:dev": "Grant Developer role badge",
  "badges:grant:admin": "Grant Administrator role badge",
  "badges:grant:founder": "Grant Founder role badge",
  "badges:grant:author": "Grant Author role badge",
  "posts:write": "Create and edit own blog posts at /author/editor",
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export type RoleId = "founder" | "admin" | "dev" | "mod" | "author";

/** Env usernames that non-founders must never moderate or badge-edit */
export const PROTECTED_ACCOUNT_USERNAMES = ["admin"] as const;
