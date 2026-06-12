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
  `CREATE TABLE IF NOT EXISTS accounts (
    id           SERIAL PRIMARY KEY,
    username     TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    icon         TEXT,
    password_hash TEXT NOT NULL,
    signup_ip    INET,
    last_ip      INET,
    activity     JSONB NOT NULL DEFAULT '[]',
    settings     JSONB NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'`,
  `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT ''`,
  `CREATE INDEX IF NOT EXISTS accounts_username_idx ON accounts (username)`,
  `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email TEXT`,
  `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS icon_pending TEXT`,
  `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email_hash TEXT`,
  `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ`,
  `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ`,
  `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ`,
  `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ`,
  `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ban_reason TEXT`,
  `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ`,
  `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS banned_by_account_id INT REFERENCES accounts(id) ON DELETE SET NULL`,
  `DROP INDEX IF EXISTS accounts_email_lower_uidx`,
  `CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_hash_uidx ON accounts (email_hash) WHERE email_hash IS NOT NULL`,
  `UPDATE accounts SET email_verified_at = created_at WHERE email IS NULL AND email_verified_at IS NULL`,
  `CREATE TABLE IF NOT EXISTS account_email_tokens (
    id         SERIAL PRIMARY KEY,
    account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS account_email_tokens_account_idx ON account_email_tokens (account_id)`,
  `CREATE TABLE IF NOT EXISTS account_tokens (
    id         SERIAL PRIMARY KEY,
    account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS account_tokens_hash_idx ON account_tokens (token_hash)`,
  `CREATE INDEX IF NOT EXISTS account_tokens_account_idx ON account_tokens (account_id)`,
  `CREATE TABLE IF NOT EXISTS account_bridges (
    id               SERIAL PRIMARY KEY,
    account_id       INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    provider         TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    tokens           JSONB NOT NULL DEFAULT '{}',
    metadata         JSONB NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS account_bridges_account_idx ON account_bridges (account_id)`,
  `CREATE TABLE IF NOT EXISTS post_comments (
    id         SERIAL PRIMARY KEY,
    post_slug  TEXT NOT NULL,
    account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS post_comments_slug_idx ON post_comments (post_slug, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS post_comments_account_idx ON post_comments (account_id, created_at DESC)`,
  `ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES post_comments(id) ON DELETE CASCADE`,
  `CREATE INDEX IF NOT EXISTS post_comments_parent_idx ON post_comments (parent_id)`,
  `CREATE TABLE IF NOT EXISTS account_badges (
    id          SERIAL PRIMARY KEY,
    account_id  INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    slug        TEXT NOT NULL,
    granted_by  INT REFERENCES accounts(id) ON DELETE SET NULL,
    awarded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS account_badges_account_idx ON account_badges (account_id, awarded_at DESC)`,
  `ALTER TABLE account_badges ADD COLUMN IF NOT EXISTS granted_by INT REFERENCES accounts(id) ON DELETE SET NULL`,
  `DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'account_badges'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'account_badges' AND column_name = 'id'
    ) THEN
      CREATE TABLE account_badges_next (
        id          SERIAL PRIMARY KEY,
        account_id  INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        slug        TEXT NOT NULL,
        granted_by  INT REFERENCES accounts(id) ON DELETE SET NULL,
        awarded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      INSERT INTO account_badges_next (account_id, slug, awarded_at)
      SELECT account_id, slug, awarded_at FROM account_badges;
      DROP TABLE account_badges;
      ALTER TABLE account_badges_next RENAME TO account_badges;
      CREATE INDEX IF NOT EXISTS account_badges_account_idx ON account_badges (account_id, awarded_at DESC);
    END IF;
  END $$`,
  `DELETE FROM account_badges a
   USING account_badges b
   WHERE a.account_id = b.account_id AND a.slug = b.slug AND a.id > b.id`,
  `ALTER TABLE account_badges ADD COLUMN IF NOT EXISTS grant_key TEXT`,
  `UPDATE account_badges SET grant_key = slug WHERE grant_key IS NULL OR grant_key = ''`,
  `ALTER TABLE account_badges ALTER COLUMN grant_key SET DEFAULT ''`,
  `DROP INDEX IF EXISTS account_badges_account_slug_uidx`,
  `CREATE UNIQUE INDEX IF NOT EXISTS account_badges_account_grant_key_uidx ON account_badges (account_id, grant_key)`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id               SERIAL PRIMARY KEY,
    account_id       INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    actor_account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
    type             TEXT NOT NULL,
    post_slug        TEXT,
    comment_id       INT REFERENCES post_comments(id) ON DELETE SET NULL,
    message          TEXT NOT NULL DEFAULT '',
    read_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS notifications_account_idx ON notifications (account_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications (account_id) WHERE read_at IS NULL`,
  `CREATE TABLE IF NOT EXISTS notification_suppressions (
    account_id            INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    suppressed_account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (account_id, suppressed_account_id)
  )`,
  `CREATE TABLE IF NOT EXISTS security_events (
    id         SERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    ip_address INET,
    account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
    meta       JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS security_events_type_created_idx ON security_events (event_type, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
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
  )`,
  `CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS audit_logs_category_created_idx ON audit_logs (category, created_at DESC)`,
  `ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved'`,
  `ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS moderated_by_account_id INT REFERENCES accounts(id) ON DELETE SET NULL`,
  `ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ`,
  `ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS moderation_reason TEXT`,
  `CREATE INDEX IF NOT EXISTS post_comments_moderation_idx ON post_comments (post_slug, moderation_status)`,
] as const;

export const AUDIT_LOGS_TABLE = "audit_logs";

export const SECURITY_EVENTS_TABLE = "security_events";

export const ACCOUNT_BADGES_TABLE = "account_badges";
export const NOTIFICATIONS_TABLE = "notifications";
export const NOTIFICATION_SUPPRESSIONS_TABLE = "notification_suppressions";

export const ACCOUNTS_TABLE = "accounts";
export const ACCOUNT_EMAIL_TOKENS_TABLE = "account_email_tokens";
export const ACCOUNT_TOKENS_TABLE = "account_tokens";
export const ACCOUNT_BRIDGES_TABLE = "account_bridges";
export const POST_COMMENTS_TABLE = "post_comments";
export const ACCOUNT_SESSION_COOKIE = "account_session";
export const ACCOUNT_SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type AccountActivityEntry = {
  type: string;
  at: string;
  ip?: string | null;
  meta?: Record<string, string | number | boolean | null>;
};

export type AccountRow = {
  id: number;
  username: string;
  display_name: string;
  icon: string | null;
  icon_pending: string | null;
  bio: string;
  signup_ip: string | null;
  last_ip: string | null;
  activity: AccountActivityEntry[];
  settings: Record<string, unknown>;
  banned_at: Date | null;
  ban_reason: string | null;
  banned_until: Date | null;
  banned_by_account_id: number | null;
  created_at: Date;
  updated_at: Date;
};

export type AccountBanView = {
  reason: string | null;
  bannedAt: string;
  expiresAt: string | null;
  bannedBy: { username: string; displayName: string } | null;
};

export type AccountSettings = {
  profilePublic: boolean;
  showBadges: boolean;
  showCommentHistory: boolean;
  /** null = auto (highest-rank badge beside name) */
  featuredBadgeSlug: string | null;
  /** Custom order for profile badge row (slugs) */
  badgeOrder: string[];
  /** Slugs hidden from public profile badge row */
  hiddenBadgeSlugs: string[];
};

export type AccountBadge = {
  slug: string;
  label: string;
  description: string;
  tone: "neutral" | "accent" | "staff";
  awardedAt: string;
  /** Stack count when badge allows multiple grants */
  count?: number;
  /** e.g. "3 years" for annual_member */
  stackLabel?: string;
};

export type AccountPublic = {
  username: string;
  displayName: string;
  icon: string | null;
  bio: string;
  createdAt: string;
};

/** Session-only fields — never expose on public profiles. */
export type AccountSession = AccountPublic & {
  emailVerified: boolean;
  email: string | null;
  iconPending: string | null;
  ban: AccountBanView | null;
};

export type AccountListItem = {
  id: number;
  username: string;
  displayName: string;
  bio: string;
  icon: string | null;
  iconPending: string | null;
  createdAt: string;
  commentCount: number;
  badgeSlugs: string[];
  settings: AccountSettings;
  emailVerified: boolean;
  bannedAt: string | null;
  banReason: string | null;
  bannedUntil: string | null;
  bannedBy: { username: string; displayName: string } | null;
  warningCount: number;
};

export type NotificationRow = {
  id: number;
  account_id: number;
  actor_account_id: number | null;
  type: string;
  post_slug: string | null;
  comment_id: number | null;
  message: string;
  read_at: Date | null;
  created_at: Date;
  actor_username: string | null;
  actor_display_name: string | null;
  actor_icon: string | null;
};

export type PostCommentRow = {
  id: number;
  post_slug: string;
  account_id: number;
  parent_id: number | null;
  content: string;
  created_at: Date;
  moderation_status?: string | null;
  username: string;
  display_name: string;
  icon: string | null;
};
