import type { CookiePreferences } from "../schema";

/** 12 months in seconds (365 days). */
export const CONSENT_RETENTION_SEC = 60 * 60 * 24 * 365;

export function decidedAtUnix(prefs: CookiePreferences): number | null {
  const v = prefs.decidedAt;
  if (typeof v === "number" && Number.isFinite(v)) return Math.floor(v);
  if (typeof v === "string") {
    const asNum = Number(v);
    if (Number.isFinite(asNum) && /^\d+$/.test(v.trim())) return Math.floor(asNum);
    const ms = Date.parse(v);
    return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
  }
  return null;
}

export function consentDecidedNow(): number {
  return Math.floor(Date.now() / 1000);
}

export function isConsentExpired(prefs: CookiePreferences, nowSec = Math.floor(Date.now() / 1000)): boolean {
  if (!prefs.decided) return false;
  const decided = decidedAtUnix(prefs);
  if (!decided) return false;
  return nowSec - decided >= CONSENT_RETENTION_SEC;
}

export function consentExpiresAtUnix(prefs: CookiePreferences): number | null {
  const decided = decidedAtUnix(prefs);
  return decided == null ? null : decided + CONSENT_RETENTION_SEC;
}
