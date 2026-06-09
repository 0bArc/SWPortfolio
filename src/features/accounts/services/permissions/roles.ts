import { roleLabelFromSlugs } from "@/features/accounts/services/badges/award";

/** Primary role label for display (highest rank held). */
export function roleLabelsForUser(_username: string, badgeSlugs: string[]): string[] {
  const label = roleLabelFromSlugs(badgeSlugs);
  if (label) return [label];
  return ["Member"];
}
