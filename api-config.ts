/**
 * API & integration config — edit here.
 *
 * Values below are defaults. `.env.local` overrides when the same key is set
 * (useful for production secrets without committing them).
 *
 * Mail (Resend): verify domain in Resend dashboard, then EMAIL_FROM must match
 * that exact domain (e.g. verify@mail.kristiansen.icu if you verified mail.*).
 *
 * Security secrets (set in .env.local — never commit):
 *   DATA_ENCRYPTION_KEY  — openssl rand -hex 32  (email encryption + token pepper)
 *   DATABASE_SSL=true    — TLS to Postgres in production
 */

function env(key: string, fallback: string): string {
  const value = process.env[key]?.trim();
  return value || fallback;
}

// ── Edit defaults ─────────────────────────────────────────────

const defaults = {
  site: {
    owner: "Sander Kristiansen",
    contactEmail: "",
    featuredWork: "",
    siteUrl: "https://kristiansen.icu",
    banner: "",
  },
  github: {
    user: "",
    token: "",
  },
  admin: {
    username: "admin",
    password: "",
    sessionSecret: "",
  },
  turnstile: {
    // Dev test keys (always pass): site 1x00000000000000000000AA / secret 1x0000000000000000000000000000000AA
    siteKey: "",
    secretKey: "",
  },
  mail: {
    resendApiKey: "",
    from: "verify@kristiansen.icu",
    replyTo: "",
  },
  deepl: {
    apiKey: "",
  },
} as const;

// ── Resolved config (env overrides defaults) ──────────────────

export const siteConfig = {
  owner: env("NEXT_PUBLIC_SITE_OWNER", defaults.site.owner),
  contactEmail: env("NEXT_PUBLIC_CONTACT_EMAIL", defaults.site.contactEmail),
  featuredWork: env("NEXT_PUBLIC_FEATURED_WORK", defaults.site.featuredWork),
  siteUrl: env("SITE_URL", env("NEXT_PUBLIC_SITE_URL", defaults.site.siteUrl)).replace(/\/$/, ""),
  banner: env("NEXT_PUBLIC_BANNER", defaults.site.banner),
  devMode: env("NEXT_PUBLIC_DEV_MODE", env("DEV_MODE", "false")) === "true",
};

export const githubConfig = {
  user: env("NEXT_PUBLIC_GITHUB_USER", defaults.github.user),
  token: env("GITHUB_TOKEN", defaults.github.token),
  url: `https://github.com/${env("NEXT_PUBLIC_GITHUB_USER", defaults.github.user)}`,
};

export const adminConfig = {
  username: env("ADMIN_USERNAME", defaults.admin.username),
  password: env("ADMIN_PASSWORD", defaults.admin.password),
  sessionSecret: env("ADMIN_SESSION_SECRET", defaults.admin.sessionSecret),
};

export const turnstileConfig = {
  siteKey: env("NEXT_PUBLIC_TURNSTILE_SITE_KEY", defaults.turnstile.siteKey),
  secretKey: env("TURNSTILE_SECRET_KEY", defaults.turnstile.secretKey),
};

export const mailConfig = {
  resendApiKey: env("RESEND_API_KEY", defaults.mail.resendApiKey),
  from: env("EMAIL_FROM", defaults.mail.from),
  replyTo: env("EMAIL_REPLY_TO", defaults.mail.replyTo),
};

export const deeplConfig = {
  apiKey: env("DEEPL_API_KEY", defaults.deepl.apiKey),
};

/** Shorthand for importing everything. */
export const apiConfig = {
  site: siteConfig,
  github: githubConfig,
  admin: adminConfig,
  turnstile: turnstileConfig,
  mail: mailConfig,
  deepl: deeplConfig,
} as const;
