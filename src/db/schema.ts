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

/** Idempotent SQL — safe to run on every cold start. Never drops data. */
export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS posts (
    id             SERIAL PRIMARY KEY,
    slug           TEXT UNIQUE NOT NULL,
    title          TEXT NOT NULL,
    excerpt        TEXT NOT NULL DEFAULT '',
    content        TEXT NOT NULL DEFAULT '',
    tags           TEXT[] NOT NULL DEFAULT '{}',
    author         TEXT NOT NULL DEFAULT 'Sander Kristiansen',
    status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    date           DATE NOT NULL,
    reading_time   INT NOT NULL DEFAULT 1,
    featured_image TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE posts ADD COLUMN IF NOT EXISTS featured_image TEXT`,
  `CREATE INDEX IF NOT EXISTS posts_status_date ON posts (status, date DESC)`,
  `CREATE TABLE IF NOT EXISTS ${SITE_VISITORS_TABLE} (
    id          SERIAL PRIMARY KEY,
    visitor_id  TEXT UNIQUE NOT NULL,
    cookies     JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS site_visitors_visitor_id_idx ON ${SITE_VISITORS_TABLE} (visitor_id)`,
  `CREATE TABLE IF NOT EXISTS tag_styles (
    slug       TEXT PRIMARY KEY,
    config     JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
] as const;
