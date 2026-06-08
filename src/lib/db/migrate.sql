-- Additive migrations only. Safe to re-run — never DROP or TRUNCATE.
-- Dev seed lives in seed.sql (./run.sh db --seed).

CREATE TABLE IF NOT EXISTS posts (
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
);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS featured_image TEXT;

CREATE INDEX IF NOT EXISTS posts_status_date ON posts (status, date DESC);

CREATE TABLE IF NOT EXISTS site_visitors (
  id          SERIAL PRIMARY KEY,
  visitor_id  TEXT UNIQUE NOT NULL,
  cookies     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS site_visitors_visitor_id_idx ON site_visitors (visitor_id);

CREATE TABLE IF NOT EXISTS tag_styles (
  slug       TEXT PRIMARY KEY,
  config     JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
