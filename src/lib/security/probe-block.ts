/** Block common scanner / leak paths — return 404, log as probe. */

const EXACT = new Set([
  "/credentials.json",
  "/secrets.json",
  "/.env.backup",
  "/.env.production",
  "/.env.local",
  "/.env",
  "/backup.tar.gz",
  "/backup.zip",
  "/www.tar.gz",
  "/site.tar.gz",
  "/db.sql",
  "/database.sql",
  "/dump.sql",
  "/wp-config.php.bak",
  "/package.json.bak",
  "/deploy.sh",
  "/install.php",
  "/setup.php",
  "/phpinfo.php",
  "/superadmin",
  "/backend",
]);

const PREFIXES = [
  "/.git/",
  "/.git",
  "/.env.",
  "/api/internal/",
  "/api/debug/",
  "/config/database",
  "/config/secrets",
];

const SUFFIX_RE =
  /\.(sql|bak|tar\.gz|tar|zip|old|swp|php)$/i;

export function isBlockedProbePath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  const lower = path.toLowerCase();

  if (EXACT.has(lower)) return true;

  for (const prefix of PREFIXES) {
    if (lower === prefix || lower.startsWith(prefix)) return true;
  }

  if (lower.includes("/.env")) return true;
  if (lower.includes("/.git/") || lower.endsWith("/.git")) return true;

  if (SUFFIX_RE.test(lower) && !lower.startsWith("/uploads/")) return true;

  return false;
}
