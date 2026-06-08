import { randomUUID } from "crypto";
import { getPoolReady } from "@/lib/db";
import {
  COOKIE_PREF_DEFAULTS,
  SITE_VISITORS_TABLE,
  type CookiePreferences,
  type CookiePrefValue,
} from "../schema";
import {
  consentDecidedNow,
  CONSENT_RETENTION_SEC,
  isConsentExpired,
} from "./consent-retention";

export function mergeCookiePrefs(raw: unknown): CookiePreferences {
  const base: CookiePreferences = { ...COOKIE_PREF_DEFAULTS };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (key === "preferences") continue;
    if (
      typeof value === "boolean" ||
      typeof value === "string" ||
      typeof value === "number" ||
      value === null
    ) {
      base[key] = value;
    }
  }
  base.essential = true;
  return base;
}

export function prefsFromAction(
  action: "accept" | "deny" | "modify",
  patch?: Partial<CookiePreferences>
): CookiePreferences {
  const now = consentDecidedNow();
  if (action === "accept") {
    return mergeCookiePrefs({
      essential: true,
      analytics: true,
      decided: true,
      decidedAt: now,
    });
  }
  if (action === "deny") {
    return mergeCookiePrefs({
      essential: true,
      analytics: false,
      decided: true,
      decidedAt: now,
    });
  }
  return mergeCookiePrefs({
    essential: true,
    analytics: patch?.analytics ?? false,
    decided: true,
    decidedAt: now,
    ...patch,
  });
}

export async function deleteVisitorConsent(visitorId: string): Promise<void> {
  const pool = await getPoolReady();
  await pool.query(`DELETE FROM ${SITE_VISITORS_TABLE} WHERE visitor_id = $1`, [visitorId]);
}

/** Remove all consent rows older than retention window (unix decidedAt or updated_at fallback). */
export async function purgeExpiredConsents(): Promise<number> {
  const pool = await getPoolReady();
  const cutoff = Math.floor(Date.now() / 1000) - CONSENT_RETENTION_SEC;
  const { rowCount } = await pool.query(
    `DELETE FROM ${SITE_VISITORS_TABLE}
     WHERE cookies->>'decided' = 'true'
       AND (
         (cookies->>'decidedAt' ~ '^[0-9]+$' AND (cookies->>'decidedAt')::bigint < $1)
         OR updated_at < NOW() - INTERVAL '12 months'
       )`,
    [cutoff]
  );
  return rowCount ?? 0;
}

export async function getVisitorCookies(visitorId: string): Promise<CookiePreferences | null> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<{ cookies: unknown }>(
    `SELECT cookies FROM ${SITE_VISITORS_TABLE} WHERE visitor_id = $1`,
    [visitorId]
  );
  if (!rows[0]) return null;
  const prefs = mergeCookiePrefs(rows[0].cookies);
  if (isConsentExpired(prefs)) {
    await deleteVisitorConsent(visitorId);
    return null;
  }
  return prefs;
}

export async function upsertVisitorCookies(
  visitorId: string,
  cookies: CookiePreferences
): Promise<CookiePreferences> {
  const pool = await getPoolReady();
  const merged = mergeCookiePrefs(cookies);
  const { rows } = await pool.query<{ cookies: unknown }>(
    `INSERT INTO ${SITE_VISITORS_TABLE} (visitor_id, cookies)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (visitor_id) DO UPDATE SET
       cookies = ${SITE_VISITORS_TABLE}.cookies || EXCLUDED.cookies,
       updated_at = NOW()
     RETURNING cookies`,
    [visitorId, JSON.stringify(merged)]
  );
  return mergeCookiePrefs(rows[0]?.cookies);
}

export function newVisitorId(): string {
  return randomUUID();
}

export function pickCookiePatch(body: Record<string, unknown>): Partial<CookiePreferences> {
  const patch: Partial<CookiePreferences> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === "action") continue;
    if (typeof value === "boolean" || typeof value === "string" || typeof value === "number" || value === null) {
      patch[key] = value as CookiePrefValue;
    }
  }
  return patch;
}
