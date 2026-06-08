/** Client-safe role labels from badges (no DB imports). */
export function roleLabelsForUser(_username: string, badgeSlugs: string[]): string[] {
  const slugs = new Set(badgeSlugs);
  const roles: string[] = [];
  if (slugs.has("founder") || slugs.has("staff")) roles.push("Admin");
  if (slugs.has("developer")) roles.push("Developer");
  if (slugs.has("stratware")) roles.push("Admin");
  if (roles.length === 0) roles.push("Member");
  return roles;
}
