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
ALTER TABLE posts ADD COLUMN IF NOT EXISTS account_id INT REFERENCES accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS posts_status_date ON posts (status, date DESC);
CREATE INDEX IF NOT EXISTS posts_account_id_idx ON posts (account_id);

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

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS icon_pending TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email_hash TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ;
DROP INDEX IF EXISTS accounts_email_lower_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_hash_uidx ON accounts (email_hash) WHERE email_hash IS NOT NULL;
UPDATE accounts SET email_verified_at = created_at WHERE email IS NULL AND email_verified_at IS NULL;

CREATE TABLE IF NOT EXISTS account_email_tokens (
  id         SERIAL PRIMARY KEY,
  account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS account_email_tokens_account_idx ON account_email_tokens (account_id);

CREATE TABLE IF NOT EXISTS security_events (
  id         SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  ip_address INET,
  account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
  meta       JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS security_events_type_created_idx ON security_events (event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS media_assets (
  id                     UUID PRIMARY KEY,
  account_id             INT REFERENCES accounts(id) ON DELETE SET NULL,
  uploaded_by_account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
  kind                   TEXT NOT NULL CHECK (kind IN ('avatar', 'blog')),
  status                 TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'superseded')),
  file_size              INT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at            TIMESTAMPTZ,
  approved_by_account_id INT REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS media_assets_account_kind_idx ON media_assets (account_id, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS media_assets_status_created_idx ON media_assets (status, created_at DESC);
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS content_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS media_assets_content_hash_uidx ON media_assets (content_hash) WHERE content_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS account_api_keys (
  id         SERIAL PRIMARY KEY,
  account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT 'Default',
  key_prefix TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS account_api_keys_account_idx ON account_api_keys (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS account_api_keys_active_idx ON account_api_keys (account_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS audit_logs (
  id                   SERIAL PRIMARY KEY,
  event_type           TEXT NOT NULL,
  category             TEXT NOT NULL,
  actor_account_id     INT REFERENCES accounts(id) ON DELETE SET NULL,
  target_account_id    INT REFERENCES accounts(id) ON DELETE SET NULL,
  target_resource_type TEXT,
  target_resource_id   TEXT,
  summary              TEXT NOT NULL,
  meta                 JSONB NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_category_created_idx ON audit_logs (category, created_at DESC);

ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS moderated_by_account_id INT REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS moderation_reason TEXT;
CREATE INDEX IF NOT EXISTS post_comments_moderation_idx ON post_comments (post_slug, moderation_status);
