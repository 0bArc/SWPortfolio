#!/usr/bin/env bash
set -euo pipefail

CMD="${1:-help}"

# .env.local values aren't quoted, parse manually
if [[ -f .env.local ]]; then
  while IFS='=' read -r k v || [[ -n "$k" ]]; do
    [[ "$k" =~ ^[[:space:]]*# ]] && continue
    k="${k#"${k%%[![:space:]]*}"}"
    k="${k%"${k##*[![:space:]]}"}"
    [[ -z "$k" ]] && continue
    export "$k=$v"
  done < .env.local
fi

APP="${APP_NAME:?APP_NAME not set in .env.local}"
DIR="${APP_DIR:?APP_DIR not set in .env.local}"

R='\033[0;31m' G='\033[0;32m' Y='\033[1;33m' B='\033[0;34m' N='\033[0m'
info()  { echo -e "${B}[run]${N} $*"; }
ok()    { echo -e "${G}[OK]${N}  $*"; }
warn()  { echo -e "${Y}[WARN]${N} $*"; }
die()   { echo -e "${R}[ERR]${N} $*"; exit 1; }

parse_db_url() {
  local url="${DATABASE_URL:-postgresql://postgres:password@localhost:5432/blog}"
  DB_USER=$(echo "$url" | sed -E 's|.*://([^:]+):.*|\1|')
  DB_PASS=$(echo "$url" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')
  DB_NAME=$(echo "$url" | sed -E 's|.*/([^/?]+).*|\1|')
  DB_NAME="${DB_NAME:-blog}"
}

apply_schema() {
  sudo -u postgres psql -d "$DB_NAME" < src/lib/db/schema.sql
  sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 <<SQL
GRANT ALL ON ALL TABLES IN SCHEMA public TO "${DB_USER}";
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO "${DB_USER}";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${DB_USER}";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${DB_USER}";
SQL
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
}

ensure_docker_db() {
  parse_db_url

  if docker start blog-db &>/dev/null 2>&1; then
    ok "blog-db started"
  else
    info "Creating blog-db container..."
    docker run -d --name blog-db \
      -e POSTGRES_PASSWORD="$DB_PASS" \
      -e POSTGRES_USER="$DB_USER" \
      -e POSTGRES_DB="$DB_NAME" \
      -p 5432:5432 \
      postgres:16
  fi

  until docker exec blog-db pg_isready -U "$DB_USER" -q &>/dev/null; do sleep 1; done
  ok "Postgres ready"
  docker exec blog-db psql -U "$DB_USER" -d postgres \
    -c "ALTER USER \"${DB_USER}\" WITH PASSWORD '${DB_PASS}';" >/dev/null 2>&1 || true
  docker exec -i blog-db psql -U "$DB_USER" -d "$DB_NAME" < src/lib/db/schema.sql
}

ensure_node() {
  command -v node &>/dev/null || die "Node.js not found — run './run.sh setup' first"
  ok "Node $(node -v)"
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
  if [[ -d .next && -f "$stamp" ]] && [[ -z "$(find src public next.config.ts package.json -newer "$stamp" 2>/dev/null | head -1)" ]]; then
    ok "Build up to date"
    return
  fi
  info "Building..."
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
  info "Database setup..."
  if command -v psql &>/dev/null; then
    ensure_native_db
  elif command -v docker &>/dev/null; then
    ensure_docker_db
  else
    die "Need psql or Docker — run './run.sh setup' or install Docker"
  fi
  ok "DB ready (${DATABASE_URL:-postgresql://postgres:password@localhost:5432/blog})"
}

cmd_deploy() {
  ensure_pm2
  info "Pulling..."
  git pull

  if git diff --name-only HEAD@{1} HEAD | grep -q "package-lock.json"; then
    info "Lockfile changed — npm ci..."
    npm ci
    echo "$(md5sum package-lock.json | cut -d' ' -f1)" > .install-stamp
  else
    ok "Deps unchanged"
  fi

  info "Building..."
  npm run build
  touch .build-stamp

  if pm2 list | grep -q "$APP"; then
    pm2 restart "$APP"
  else
    pm2 start npm --name "$APP" -- start
    pm2 save
  fi
  run_hook restart
  ok "Deployed"
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
  ensure_build

  if pm2 list | grep -q "$APP"; then
    pm2 restart "$APP"
  else
    pm2 start npm --name "$APP" -- start
    pm2 save
  fi

  STARTUP_CMD=$(pm2 startup 2>&1 | grep -E '^\s*sudo' | head -1)
  if [[ -n "$STARTUP_CMD" ]]; then
    eval "$STARTUP_CMD"
    ok "PM2 autostart configured"
  fi
  run_hook start
  ok "Install done"
}

cmd_auto() {
  cmd_setup
  cmd_install
  cmd_nginx
  ok "Live on port 80"
  pm2 status "$APP"
}

cmd_nginx() {
  CONF="/etc/nginx/sites-available/swportfolio"
  local app_port=3000
  [[ -x "./.sys" ]] && app_port=$(./.sys port 2>/dev/null || echo 3000)

  sudo tee "$CONF" > /dev/null <<NGINX
server {
    listen 80;
    server_name swportfolio.win www.swportfolio.win;

    location / {
        proxy_pass         http://localhost:${app_port};
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
  sudo ln -sf "$CONF" /etc/nginx/sites-enabled/swportfolio
  sudo nginx -t && sudo systemctl reload nginx
  ok "Nginx → port ${app_port}"
}

cmd_logs()   { pm2 logs "$APP" --lines "${2:-50}"; }
cmd_status() { pm2 status "$APP"; }
cmd_restart(){ pm2 restart "$APP"; run_hook restart; ok "Restarted"; }
cmd_stop()   { pm2 stop "$APP"; run_hook stop; warn "Stopped"; }

cmd_help() {
  echo ""
  echo -e "  ${B}swportfolio — run.sh${N}"
  echo ""
  echo "  auto          First-time server setup (Node + PM2 + Nginx + install)"
  echo "  dev           Local dev server"
  echo "  db            Create DB + apply schema (uses DATABASE_URL from .env.local)"
  echo "  deploy        git pull + build + PM2 restart"
  echo "  setup         Install system deps (Node, PM2, Nginx, Postgres)"
  echo "  install       npm ci + build + PM2 start"
  echo "  nginx         Write Nginx reverse-proxy config"
  echo "  logs [n]      PM2 logs (default 50 lines)"
  echo "  status        PM2 status"
  echo "  restart       PM2 restart"
  echo "  stop          PM2 stop"
  echo ""
}

case "$CMD" in
  auto)    cmd_auto ;;
  dev)     cmd_dev ;;
  db)      cmd_db ;;
  deploy)  cmd_deploy ;;
  setup)   cmd_setup ;;
  install) cmd_install ;;
  nginx)   cmd_nginx ;;
  logs)    cmd_logs "$@" ;;
  status)  cmd_status ;;
  restart) cmd_restart ;;
  stop)    cmd_stop ;;
  *)       cmd_help ;;
esac
