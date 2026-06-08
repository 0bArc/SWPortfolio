/** Extensible cookie preference shape — new keys merge in without DB migrations. */
export const COOKIE_PREF_DEFAULTS = {
  essential: true,
  analytics: false,
  decided: false,
  decidedAt: null as string | null,
} as const;

export type CookiePrefValue = boolean | string | number | null;
export type CookiePreferences = Record<string, CookiePrefValue>;

export const VISITOR_COOKIE = "visitor_id";
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 12 months

export const SITE_VISITORS_TABLE = "site_visitors";

/** Idempotent SQL — safe to run on every cold start. */
export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS ${SITE_VISITORS_TABLE} (
    id          SERIAL PRIMARY KEY,
    visitor_id  TEXT UNIQUE NOT NULL,
    cookies     JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS site_visitors_visitor_id_idx ON ${SITE_VISITORS_TABLE} (visitor_id)`,
] as const;
