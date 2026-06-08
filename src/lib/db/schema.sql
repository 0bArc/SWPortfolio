-- Reference SQL — keep in sync with src/db/schema.ts (run.bat db pipes this file)
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

CREATE TABLE IF NOT EXISTS accounts (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  icon          TEXT,
  password_hash TEXT NOT NULL,
  signup_ip     INET,
  last_ip       INET,
  activity      JSONB NOT NULL DEFAULT '[]',
  settings      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS accounts_username_idx ON accounts (username);

CREATE TABLE IF NOT EXISTS account_tokens (
  id         SERIAL PRIMARY KEY,
  account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  ip_address INET,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS account_tokens_hash_idx ON account_tokens (token_hash);
CREATE INDEX IF NOT EXISTS account_tokens_account_idx ON account_tokens (account_id);

CREATE TABLE IF NOT EXISTS account_bridges (
  id               SERIAL PRIMARY KEY,
  account_id       INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  tokens           JSONB NOT NULL DEFAULT '{}',
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS account_bridges_account_idx ON account_bridges (account_id);

CREATE TABLE IF NOT EXISTS post_comments (
  id         SERIAL PRIMARY KEY,
  post_slug  TEXT NOT NULL,
  account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS post_comments_slug_idx ON post_comments (post_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS post_comments_account_idx ON post_comments (account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS account_badges (
  id          SERIAL PRIMARY KEY,
  account_id  INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  granted_by  INT REFERENCES accounts(id) ON DELETE SET NULL,
  awarded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS account_badges_account_idx ON account_badges (account_id, awarded_at DESC);
