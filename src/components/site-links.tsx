const PATHS = [
  "/credentials.json",
  "/secrets.json",
  "/.env.backup",
  "/.env.production",
  "/config/database.yml",
  "/config/secrets.yml",
  "/api/internal/config",
  "/api/internal/users",
  "/api/internal/keys",
  "/api/debug/info",
  "/api/debug/env",
  "/admin/dashboard",
  "/admin/users",
  "/management/users",
  "/management/settings",
  "/superadmin",
  "/backend",
  "/backup.tar.gz",
  "/backup.zip",
  "/www.tar.gz",
  "/site.tar.gz",
  "/db.sql",
  "/database.sql",
  "/dump.sql",
  "/wp-config.php.bak",
  "/package.json.bak",
  "/.git/credentials",
  "/deploy.sh",
  "/install.php",
  "/setup.php",
  "/phpinfo.php",
];

export function SiteLinks() {
  return (
    <div className="site-meta" aria-hidden="true">
      {PATHS.map((path) => (
        <a key={path} href={path} tabIndex={-1}>
          {path}
        </a>
      ))}
    </div>
  );
}
