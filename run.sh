#!/usr/bin/env bash
# Production: Ubuntu server — PM2 + Nginx + Postgres (native or Docker blog-db).
# Deploy: ./run.sh update   (never auto on live box)
#
# ── New code checklist (agents + humans) ─────────────────────
# When you add/change site features, think deploy path:
#   1. DB schema  → additive SQL in src/database/sql/migrate.sql (IF NOT EXISTS only)
#   2. Env vars   → document in .env.example; read via api-config.ts or .env.local
#   3. Uploads    → files under uploads/blog (run.sh ensure_uploads; not in git)
#   4. Build      → npm run build must pass; update runs build before PM2 restart
#   5. Migrations → run on deploy via apply_migrations; no app-only schema for prod tables
#   6. Secrets    → never commit .env.local; server keeps its own copy
#   7. Verify     → ./run.sh doctor after deploy (row counts + HTTP + blog sanity)
#   8. API + CF     → Cloudflare must SKIP bot challenge on /api/v1/* (see doctor warn)
# Local dev: run.bat local (Windows) or ./run.sh dev
# ────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

CMD="${1:-help}"

load_env_local() {
  [[ -f .env.local ]] || return 0
  while IFS='=' read -r k v || [[ -n "$k" ]]; do
    [[ "$k" =~ ^[[:space:]]*# ]] && continue
    k="${k#"${k%%[![:space:]]*}"}"
    k="${k%"${k##*[![:space:]]}"}"
    [[ -z "$k" ]] && continue
    export "$k=$v"
  done < .env.local
}

load_env_local

APP="${APP_NAME:?APP_NAME not set in .env.local}"
DIR="${APP_DIR:?APP_DIR not set in .env.local}"
SITE_DOMAIN="${SITE_DOMAIN:-$(basename "$DIR")}"
APP_PORT="${APP_PORT:-3000}"

R='\033[0;31m' G='\033[0;32m' Y='\033[1;33m' B='\033[0;34m' N='\033[0m'
info()  { echo -e "${B}[run]${N} $*"; }
ok()    { echo -e "${G}[OK]${N}  $*"; }
warn()  { echo -e "${Y}[WARN]${N} $*"; }
die()   { echo -e "${R}[ERR]${N} $*"; exit 1; }

DOCKER_DB_VOLUME="${DOCKER_DB_VOLUME:-blog-db-data}"

parse_db_url() {
  local url="${DATABASE_URL:-postgresql://postgres:password@localhost:5432/blog}"
  DB_USER=$(echo "$url" | sed -E 's|.*://([^:]+):.*|\1|')
  DB_PASS=$(echo "$url" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')
  DB_HOST=$(echo "$url" | sed -E 's|.*@([^:/]+).*|\1|')
  DB_NAME=$(echo "$url" | sed -E 's|.*/([^/?]+).*|\1|')
  DB_NAME="${DB_NAME:-blog}"
  DB_HOST="${DB_HOST:-localhost}"
}

db_url_display() {
  parse_db_url
  echo "${DB_USER}@${DB_HOST}/${DB_NAME}"
}

db_can_connect() {
  command -v psql &>/dev/null && [[ -n "${DATABASE_URL:-}" ]] && psql "$DATABASE_URL" -c "SELECT 1" &>/dev/null
}

psql_query() {
  local sql="$1"
  if db_can_connect; then
    psql "$DATABASE_URL" -tAc "$sql" 2>/dev/null
  elif command -v docker &>/dev/null && docker ps --format '{{.Names}}' | grep -qx blog-db; then
    parse_db_url
    docker exec blog-db psql -U "$DB_USER" -d "$DB_NAME" -tAc "$sql" 2>/dev/null
  else
    parse_db_url
    sudo -u postgres psql -d "$DB_NAME" -tAc "$sql" 2>/dev/null
  fi
}

apply_migrations() {
  info "Applying additive DB migrations (data preserved)..."
  if command -v psql &>/dev/null && [[ -n "${DATABASE_URL:-}" ]]; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/database/sql/migrate.sql
  elif command -v docker &>/dev/null && docker ps --format '{{.Names}}' | grep -qx blog-db; then
    parse_db_url
    docker exec -i blog-db psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < src/database/sql/migrate.sql
  elif command -v psql &>/dev/null; then
    parse_db_url
    sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -f src/database/sql/migrate.sql
  else
    warn "No psql/docker — skipping migrations (app will migrate on first request)"
    return
  fi
  ok "Migrations applied"
}

apply_seed() {
  info "Applying dev seed (skipped rows that already exist)..."
  if command -v psql &>/dev/null && [[ -n "${DATABASE_URL:-}" ]]; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/database/sql/seed.sql
  elif command -v docker &>/dev/null && docker ps --format '{{.Names}}' | grep -qx blog-db; then
    parse_db_url
    docker exec -i blog-db psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < src/database/sql/seed.sql
  else
    parse_db_url
    sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -f src/database/sql/seed.sql
  fi
  ok "Seed applied"
}

apply_schema() {
  apply_migrations
}

ensure_native_db() {
  parse_db_url
  sudo systemctl start postgresql 2>/dev/null || true

  if sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" 2>/dev/null | grep -q 1; then
    sudo -u postgres psql -c "ALTER USER \"${DB_USER}\" WITH PASSWORD '${DB_PASS}';" >/dev/null
    ok "User '${DB_USER}' ready"
  else
    sudo -u postgres psql -c "CREATE USER \"${DB_USER}\" WITH PASSWORD '${DB_PASS}' LOGIN;" >/dev/null
    ok "User '${DB_USER}' created"
  fi

  if sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" 2>/dev/null | grep -q 1; then
    ok "DB '${DB_NAME}' exists"
  else
    sudo -u postgres psql -c "CREATE DATABASE \"${DB_NAME}\" OWNER \"${DB_USER}\";" >/dev/null
    ok "DB '${DB_NAME}' created"
  fi

  apply_schema
  sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 <<SQL
GRANT ALL ON ALL TABLES IN SCHEMA public TO "${DB_USER}";
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO "${DB_USER}";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${DB_USER}";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${DB_USER}";
SQL
}

ensure_docker_db() {
  parse_db_url
  command -v docker &>/dev/null || die "Docker not found"

  if docker ps -a --format '{{.Names}}' | grep -qx blog-db; then
    docker start blog-db &>/dev/null
    ok "blog-db started (existing container)"
  elif docker volume inspect "$DOCKER_DB_VOLUME" &>/dev/null; then
    warn "blog-db container missing but volume ${DOCKER_DB_VOLUME} exists — reattaching data"
    docker run -d --name blog-db \
      -v "${DOCKER_DB_VOLUME}:/var/lib/postgresql/data" \
      -e POSTGRES_PASSWORD="$DB_PASS" \
      -e POSTGRES_USER="$DB_USER" \
      -e POSTGRES_DB="$DB_NAME" \
      -p 5432:5432 \
      postgres:16
    ok "blog-db recreated with existing volume"
  else
    warn "Creating NEW empty Postgres container (volume: ${DOCKER_DB_VOLUME})"
    warn "This is NOT data loss on migrate/update — but a fresh DB if you expected old Docker data"
    warn "If production data is missing, check DATABASE_URL in .env.local points to the right host/db"
    docker volume create "$DOCKER_DB_VOLUME" &>/dev/null || true
    docker run -d --name blog-db \
      -v "${DOCKER_DB_VOLUME}:/var/lib/postgresql/data" \
      -e POSTGRES_PASSWORD="$DB_PASS" \
      -e POSTGRES_USER="$DB_USER" \
      -e POSTGRES_DB="$DB_NAME" \
      -p 5432:5432 \
      postgres:16
    ok "blog-db created"
  fi

  until docker exec blog-db pg_isready -U "$DB_USER" -q &>/dev/null; do sleep 1; done
  ok "Postgres ready"
  docker exec blog-db psql -U "$DB_USER" -d postgres \
    -c "ALTER USER \"${DB_USER}\" WITH PASSWORD '${DB_PASS}';" >/dev/null 2>&1 || true
  docker exec -i blog-db psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < src/database/sql/migrate.sql
}

ensure_uploads() {
  mkdir -p uploads/blog
  ok "Uploads dir ready (uploads/blog)"
}

db_stats() {
  info "Database: $(db_url_display)"
  local posts published accounts comments uploads
  posts=$(psql_query "SELECT COUNT(*) FROM posts" || echo "?")
  published=$(psql_query "SELECT COUNT(*) FROM posts WHERE status='published'" || echo "?")
  accounts=$(psql_query "SELECT COUNT(*) FROM accounts" || echo "?")
  comments=$(psql_query "SELECT COUNT(*) FROM post_comments" 2>/dev/null || echo "?")
  uploads=$(find uploads/blog -type f 2>/dev/null | wc -l | tr -d ' ')
  info "Rows: ${posts} posts (${published} published) · ${accounts} accounts · ${comments} comments · ${uploads} upload files"
}

warn_if_empty_db() {
  local posts accounts
  posts=$(psql_query "SELECT COUNT(*) FROM posts" || echo "")
  accounts=$(psql_query "SELECT COUNT(*) FROM accounts" || echo "")
  [[ "$posts" =~ ^[0-9]+$ ]] || return
  [[ "$accounts" =~ ^[0-9]+$ ]] || return
  if [[ "$posts" == "0" && "$accounts" == "0" ]]; then
    warn "Database looks EMPTY (0 posts, 0 accounts)"
    warn "migrate/update never delete data — wrong DATABASE_URL or fresh DB is likely"
    warn "Check .env.local DATABASE_URL matches your production Postgres"
    warn "Run: ./run.sh doctor"
  fi
}

ensure_node() {
  command -v node &>/dev/null || die "Node.js not found — run './run.sh setup' first"
  ok "Node $(node -v)"
}

pm_env() {
  load_env_local
  export NODE_ENV=production
  export PORT="$APP_PORT"
  # next start sets production; app enables Postgres TLS unless DATABASE_SSL=false.
  if [[ -z "${DATABASE_SSL:-}" && "${DATABASE_URL:-}" =~ @(localhost|127\.0\.0\.1)(:|/) ]]; then
    export DATABASE_SSL=false
  fi
}

pm_start() {
  pm_env
  pm2 delete "$APP" 2>/dev/null || true
  pm2 start npm --name "$APP" --cwd "$ROOT" --update-env -- start -- -p "$APP_PORT"
  pm2 save
}

pm_restart() {
  pm_env
  if pm2 describe "$APP" &>/dev/null; then
    pm2 restart "$APP" --update-env
  else
    pm_start
  fi
}

ensure_pm2() {
  if ! command -v pm2 &>/dev/null; then
    warn "PM2 not found — installing..."
    sudo npm install -g pm2
  else
    ok "PM2 $(pm2 -v)"
  fi
}

ensure_deps() {
  local stamp=".install-stamp"
  local locksum
  locksum=$(md5sum package-lock.json 2>/dev/null | cut -d' ' -f1 || echo "none")

  if [[ -d node_modules && -f "$stamp" && "$(cat "$stamp" 2>/dev/null)" == "$locksum" ]]; then
    ok "Deps up to date"
  else
    info "Installing deps..."
    npm ci
    echo "$locksum" > "$stamp"
    ok "Deps installed"
  fi
}

ensure_build() {
  local stamp=".build-stamp"
  local force="${1:-}"
  if [[ "$force" != "1" && -d .next && -f "$stamp" ]] && [[ -z "$(find src public next.config.ts package.json -newer "$stamp" 2>/dev/null | head -1)" ]]; then
    ok "Build up to date"
    return
  fi
  info "Building (clean .next)..."
  rm -rf .next
  npm run build
  touch "$stamp"
  ok "Build done"
}

run_hook() {
  [[ -x "./.sys" ]] && ./.sys "${1:-}" || true
}

cmd_dev() {
  [[ -f .env.local ]] || die ".env.local missing — copy .env.example to .env.local"
  info "Dev server..."
  npm run dev
}

cmd_db() {
  info "Database setup (additive migrations only — never wipes rows)..."
  if db_can_connect; then
    ok "Connected via DATABASE_URL → $(db_url_display)"
    apply_migrations
  elif command -v psql &>/dev/null; then
    ensure_native_db
  elif command -v docker &>/dev/null; then
    parse_db_url
    if [[ "$DB_HOST" != "localhost" && "$DB_HOST" != "127.0.0.1" ]]; then
      die "DATABASE_URL host is ${DB_HOST} but psql cannot connect — fix URL/credentials before ./run.sh db"
    fi
    ensure_docker_db
  else
    die "Need psql or Docker — run './run.sh setup' or install Docker"
  fi
  if [[ "${2:-}" == "--seed" ]]; then
    apply_seed
  fi
  db_stats
  warn_if_empty_db
  ok "DB ready"
}

cmd_migrate() {
  [[ -f .env.local ]] || die ".env.local missing"
  apply_migrations
  db_stats
  warn_if_empty_db
}

cmd_update() {
  ensure_node
  ensure_pm2
  [[ -f .env.local ]] || die ".env.local missing — copy .env.example to .env.local"

  info "Pulling latest code..."
  git pull --ff-only

  ensure_deps
  apply_migrations
  ensure_uploads
  ensure_build 1

  if pm2 list 2>/dev/null | grep -q "$APP"; then
    pm_restart
  else
    pm_start
  fi
  run_hook restart
  cmd_nginx

  sleep 2
  db_stats
  warn_if_empty_db
  if curl -sf -o /dev/null "http://127.0.0.1:${APP_PORT}/"; then
    ok "App responding on :${APP_PORT}"
  else
    warn "App NOT responding on :${APP_PORT} — run './run.sh logs'"
  fi

  ok "Update done — existing DB rows and uploads/blog files are preserved"
  pm2 status "$APP"
}

cmd_setup() {
  info "Server setup (Ubuntu 22.04+)..."

  if ! command -v node &>/dev/null; then
    info "Installing Node 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
  fi
  ensure_pm2

  if ! command -v psql &>/dev/null; then
    info "Installing PostgreSQL..."
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl enable postgresql
    sudo systemctl start postgresql
  fi

  if ! command -v nginx &>/dev/null; then
    info "Installing Nginx..."
    sudo apt install -y nginx
    sudo systemctl enable nginx
  fi

  sudo mkdir -p "$DIR"
  sudo chown "$USER:$USER" "$DIR"
  ok "Setup done — copy .env.example to .env.local, then './run.sh db' && './run.sh install'"
}

cmd_install() {
  ensure_node
  ensure_pm2
  [[ -f .env.local ]] || die ".env.local missing — copy .env.example to .env.local"

  ensure_deps
  apply_migrations
  ensure_uploads
  ensure_build

  if pm2 list 2>/dev/null | grep -q "$APP"; then
    pm_restart
  else
    pm_start
  fi

  STARTUP_CMD=$(pm2 startup 2>&1 | grep -E '^\s*sudo' | head -1)
  if [[ -n "$STARTUP_CMD" ]]; then
    eval "$STARTUP_CMD"
    ok "PM2 autostart configured"
  fi
  run_hook start
  db_stats
  warn_if_empty_db
  ok "Install done (first-time setup — use './run.sh update' for future deploys)"
}

cmd_auto() {
  cmd_setup
  cmd_install
  cmd_nginx
  ok "Live on port 80"
  pm2 status "$APP"
}

cmd_nginx() {
  CONF="/etc/nginx/sites-available/${SITE_DOMAIN}"
  info "Writing Nginx config for ${SITE_DOMAIN} → :${APP_PORT}..."

  sudo tee "$CONF" > /dev/null <<NGINX
server {
    listen 80;
    server_name ${SITE_DOMAIN} www.${SITE_DOMAIN};

    # Block common leak / scanner paths at the edge
    location ~ /\.(env|git) { return 404; }
    location ~* ^/(credentials|secrets)\.json$ { return 404; }
    location ^~ /api/internal/ { return 404; }
    location ^~ /api/debug/ { return 404; }
    location ~* \.(sql|bak|tar\.gz|zip|php)$ { return 404; }

    # Serve hashed build assets from disk (avoids Next 500 on stale chunk manifests)
    location /_next/static/ {
        alias ${ROOT}/.next/static/;
        expires 1y;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass         http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX
  sudo ln -sf "$CONF" "/etc/nginx/sites-enabled/${SITE_DOMAIN}"
  # Remove legacy symlink that pointed at the wrong upstream port.
  sudo rm -f /etc/nginx/sites-enabled/swportfolio 2>/dev/null || true
  sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
  sudo nginx -t && sudo systemctl reload nginx
  ok "Nginx → ${SITE_DOMAIN} on port ${APP_PORT}"
}

cmd_doctor() {
  info "Health check for ${SITE_DOMAIN}..."
  echo ""
  systemctl is-active nginx 2>/dev/null && ok "nginx running" || warn "nginx NOT running — sudo systemctl start nginx"
  pm2 describe "$APP" 2>/dev/null | grep -E "status|restarts|uptime" || warn "PM2 process '$APP' not found — run './run.sh install'"
  echo ""
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${APP_PORT}/" 2>/dev/null || echo "000")
  if [[ "$code" =~ ^[23] ]]; then
    ok "App :${APP_PORT} → HTTP ${code}"
  else
    warn "App :${APP_PORT} → HTTP ${code} (502 cause if nginx ok)"
    info "Try: ./run.sh logs"
  fi
  local css_href css_code css_type
  css_href=$(curl -s "http://127.0.0.1:${APP_PORT}/" 2>/dev/null | grep -oE '/_next/static/chunks/[^"]+\.css' | head -1 || true)
  if [[ -n "$css_href" ]]; then
    css_code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${APP_PORT}${css_href}" 2>/dev/null || echo "000")
    css_type=$(curl -sI "http://127.0.0.1:${APP_PORT}${css_href}" 2>/dev/null | grep -i '^content-type:' | head -1 | tr -d '\r' || true)
    if [[ "$css_code" == "200" && "$css_type" == *"text/css"* ]]; then
      ok "Static CSS ${css_href} → 200 text/css"
    else
      warn "Static CSS broken: ${css_href} → HTTP ${css_code} (${css_type:-no Content-Type})"
      warn "Run: ./run.sh update  (clean rebuild). If still broken, purge Cloudflare cache for /_next/static/*"
    fi
  fi
  local api_local api_body
  api_body=$(curl -s "http://127.0.0.1:${APP_PORT}/api/v1/me" -H "Authorization: Bearer kn_invalid" 2>/dev/null || true)
  if [[ "$api_body" == *"Invalid or revoked"* || "$api_body" == *"Missing API key"* ]]; then
    ok "API v1 local → JSON auth (origin OK)"
  else
    warn "API v1 local → unexpected response (deploy /api/v1 routes?)"
  fi
  if [[ -n "${SITE_DOMAIN:-}" ]]; then
    local cf_head
    cf_head=$(curl -sI "https://${SITE_DOMAIN}/api/v1/me" -H "Authorization: Bearer kn_test" 2>/dev/null | tr -d '\r' || true)
    if echo "$cf_head" | grep -qi 'cf-mitigated: challenge'; then
      warn "Cloudflare JS challenge blocks /api/v1 — curl/scripts get HTML 403"
      info "Fix: CF dashboard → Security rules → Skip for URI Path starts with /api/v1/"
      info "Or: Configuration Rule → Security Level Essentially Off when path starts with /api/v1/"
    elif echo "$cf_head" | grep -qi 'application/json'; then
      ok "API v1 public → JSON (Cloudflare not challenging)"
    fi
  fi
  echo ""
  if [[ -f "/etc/nginx/sites-enabled/${SITE_DOMAIN}" ]]; then
    ok "Nginx site enabled: ${SITE_DOMAIN}"
    grep "server_name" "/etc/nginx/sites-enabled/${SITE_DOMAIN}" 2>/dev/null || true
    if [[ -L "/etc/nginx/sites-enabled/swportfolio" ]]; then
      warn "Legacy nginx symlink swportfolio still enabled — run './run.sh nginx'"
    fi
    local upstream
    upstream=$(grep -E 'proxy_pass' "/etc/nginx/sites-enabled/${SITE_DOMAIN}" 2>/dev/null | head -1 || true)
    if [[ -n "$upstream" && "$upstream" != *":${APP_PORT}"* ]]; then
      warn "Nginx upstream may be wrong: ${upstream} (expected :${APP_PORT})"
    fi
    if grep -q '_next/static' "/etc/nginx/sites-enabled/${SITE_DOMAIN}" 2>/dev/null; then
      ok "Nginx serves /_next/static from disk"
    else
      warn "Nginx missing /_next/static alias — run './run.sh nginx'"
    fi
  else
    warn "No nginx config for ${SITE_DOMAIN} — run './run.sh nginx'"
  fi
  echo ""
  if [[ -n "${DATABASE_URL:-}" ]]; then
    info "DATABASE_URL → $(db_url_display)"
    if db_can_connect; then
      ok "Postgres connection OK"
      db_stats
      warn_if_empty_db
    else
      warn "Postgres connection FAILED — app may be using an empty/wrong database"
      warn "No run.sh command deletes posts/accounts; fix DATABASE_URL in .env.local"
    fi
  else
    warn "DATABASE_URL not set in .env.local"
  fi
  local uploads
  uploads=$(find uploads/blog -type f 2>/dev/null | wc -l | tr -d ' ')
  ok "Upload files in uploads/blog: ${uploads}"
  echo ""
  local posts blog_html
  posts=$(psql_query "SELECT COUNT(*) FROM posts WHERE status='published'" || echo "")
  blog_html=$(curl -s "http://127.0.0.1:${APP_PORT}/blog" 2>/dev/null || true)
  if [[ "$posts" =~ ^[1-9][0-9]*$ && "$blog_html" == *"No posts yet."* ]]; then
    warn "DB has ${posts} published post(s) but /blog shows empty"
    warn "Usually DATABASE_SSL=false for local Postgres — run './run.sh restart'"
    pm2 logs "$APP" --lines 5 --nostream 2>/dev/null | grep -iE 'error|cert|column' | tail -3 || true
  elif [[ "$posts" =~ ^[1-9][0-9]*$ ]]; then
    ok "Blog page lists published posts"
  fi
}

cmd_logs()   { pm2 logs "$APP" --lines "${2:-50}"; }
cmd_status() { pm2 status "$APP"; }
cmd_restart(){ pm_restart; run_hook restart; ok "Restarted"; }
cmd_stop()   { pm2 stop "$APP"; run_hook stop; warn "Stopped"; }

cmd_help() {
  echo ""
  echo -e "  ${B}swportfolio — run.sh${N}"
  echo ""
  echo -e "  ${Y}Data safety:${N} update/migrate/install only run migrate.sql (CREATE/ALTER IF NOT EXISTS)."
  echo "  Nothing in run.sh DROPs or TRUNCATEs posts, accounts, or comments."
  echo "  Empty site after deploy → wrong DATABASE_URL or new empty Postgres, not migrate."
  echo ""
  echo "  update         git pull + migrate + build + PM2 restart (production deploy)"
  echo "  deploy         Alias for update"
  echo "  migrate        Apply additive DB migrations only"
  echo "  doctor         Check nginx + PM2 + app + DB row counts"
  echo "  db [--seed]    Create DB + migrate (+ optional dev seed)"
  echo "  auto           First-time server (setup + install + nginx)"
  echo "  install        First-time app install (migrate + build + PM2)"
  echo "  setup          Install system deps (Node, PM2, Nginx, Postgres)"
  echo "  nginx          Write Nginx reverse-proxy config"
  echo "  dev            Local dev server"
  echo "  logs [n]       PM2 logs (default 50 lines)"
  echo "  status         PM2 status"
  echo "  restart        PM2 restart"
  echo "  stop           PM2 stop"
  echo ""
  echo "  Tip: ./run.sh doctor  shows post/account counts for your DATABASE_URL"
  echo ""
}

case "$CMD" in
  auto)    cmd_auto ;;
  dev)     cmd_dev ;;
  db)      cmd_db "$@" ;;
  migrate) cmd_migrate ;;
  update)  cmd_update ;;
  deploy)  cmd_update ;;
  setup)   cmd_setup ;;
  install) cmd_install ;;
  nginx)   cmd_nginx ;;
  doctor)  cmd_doctor ;;
  logs)    cmd_logs "$@" ;;
  status)  cmd_status ;;
  restart) cmd_restart ;;
  stop)    cmd_stop ;;
  *)       cmd_help ;;
esac
