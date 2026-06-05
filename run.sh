#!/usr/bin/env bash
set -euo pipefail

CMD="${1:-help}"

# .env.local values aren't quoted, parse manually
if [[ -f .env.local ]]; then
  while IFS='=' read -r k v || [[ -n "$k" ]]; do
    [[ "$k" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${k// }" ]] && continue
    export "$k=$v"
  done < .env.local
fi

APP="${APP_NAME:?APP_NAME not set in .env.local}"
DIR="${APP_DIR:?APP_DIR not set in .env.local}"

# colors
R='\033[0;31m' G='\033[0;32m' Y='\033[1;33m' B='\033[0;34m' N='\033[0m'
info()  { echo -e "${B}[run]${N} $*"; }
ok()    { echo -e "${G}[OK]${N}  $*"; }
warn()  { echo -e "${Y}[WARN]${N} $*"; }
die()   { echo -e "${R}[ERR]${N} $*"; exit 1; }

# ensure functions

ensure_node() {
  if ! command -v node &>/dev/null; then
    info "Node.js not found — installing Node 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
  else
    ok "Node $(node -v) already installed"
  fi
}

ensure_pm2() {
  if ! command -v pm2 &>/dev/null; then
    warn "PM2 not found — installing globally..."
    sudo npm install -g pm2
  else
    ok "PM2 $(pm2 -v) already installed"
  fi
}

ensure_postgres() {
  if ! command -v psql &>/dev/null; then
    info "Installing PostgreSQL..."
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl enable postgresql
    sudo systemctl start postgresql
    ok "PostgreSQL installed"
  else
    ok "PostgreSQL already installed"
    sudo systemctl start postgresql 2>/dev/null || true
  fi
}

ensure_redis() {
  if ! command -v redis-server &>/dev/null; then
    info "Installing Redis..."
    sudo apt install -y redis-server
    sudo systemctl enable redis-server
    sudo systemctl start redis-server
    ok "Redis installed"
  else
    ok "Redis already installed"
    sudo systemctl start redis-server 2>/dev/null || true
  fi
}

# skip install if lockfile hasn't changed
ensure_deps() {
  local stamp=".install-stamp"
  local locksum
  locksum=$(md5sum package-lock.json 2>/dev/null | cut -d' ' -f1 || echo "none")

  if [[ -d node_modules && -f "$stamp" && "$(cat "$stamp" 2>/dev/null)" == "$locksum" ]]; then
    ok "Dependencies up to date — skipping npm ci"
  else
    info "Installing dependencies..."
    npm ci
    echo "$locksum" > "$stamp"
    ok "Dependencies installed"
  fi
}

# skip build if nothing changed
ensure_build() {
  local stamp=".build-stamp"
  local changed

  if [[ -d .next && -f "$stamp" ]]; then
    changed=$(find src public next.config.ts package.json -newer "$stamp" 2>/dev/null | head -1)
    if [[ -z "$changed" ]]; then
      ok "Build up to date — skipping"
      return
    fi
  fi

  info "Building..."
  npm run build
  touch "$stamp"
  ok "Build complete"
}

# .sys hook is optional
run_hook() {
  local action="${1:-}"
  if [[ -x "./.sys" ]]; then
    ./.sys "$action" || true
  fi
}

# commands

cmd_dev() {
  [[ -f .env.local ]] || die ".env.local missing — copy .env.local.example or create it"
  info "Starting dev server..."
  npm run dev
}

cmd_deploy() {
  ensure_pm2

  info "Pulling latest..."
  git pull

  if git diff --name-only HEAD@{1} HEAD | grep -q "package-lock.json"; then
    info "package-lock.json changed — running npm ci..."
    npm ci
    echo "$(md5sum package-lock.json | cut -d' ' -f1)" > .install-stamp
  else
    ok "No dependency changes, skipping install"
  fi

  info "Building..."
  npm run build
  touch .build-stamp

  if pm2 list | grep -q "$APP"; then
    info "Restarting PM2 process..."
    pm2 restart "$APP"
  else
    warn "PM2 process '$APP' not found — starting fresh"
    pm2 start npm --name "$APP" -- start
    pm2 save
  fi

  run_hook restart

  ok "Deployed."
  pm2 status "$APP"
}

cmd_setup() {
  info "Server setup — Ubuntu 22.04+"

  ensure_node
  ensure_pm2
  ensure_postgres
  ensure_redis

  if ! command -v nginx &>/dev/null; then
    info "Installing Nginx..."
    sudo apt install -y nginx
    sudo systemctl enable nginx
  else
    ok "Nginx already installed"
  fi

  sudo mkdir -p "$DIR"
  sudo chown "$USER:$USER" "$DIR"

  ok "Setup complete — run './run.sh db' to create databases"
}

cmd_db() {
  info "Creating databases..."

  # app db
  if sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='swportfolio'" 2>/dev/null | grep -q 1; then
    ok "DB 'swportfolio' already exists"
  else
    sudo -u postgres createdb swportfolio
    ok "DB 'swportfolio' created"
  fi

  ok "Database ready."
}

cmd_install() {
  ensure_node
  ensure_pm2

  [[ -f .env.local ]] || die ".env.local missing — create it before installing"

  ensure_deps
  ensure_build

  if pm2 list | grep -q "$APP"; then
    info "PM2 process already exists — restarting..."
    pm2 restart "$APP"
  else
    info "Starting app with PM2..."
    pm2 start npm --name "$APP" -- start
    pm2 save
  fi

  STARTUP_CMD=$(pm2 startup 2>&1 | grep -E '^\s*sudo' | head -1)
  if [[ -n "$STARTUP_CMD" ]]; then
    info "Configuring autostart: $STARTUP_CMD"
    eval "$STARTUP_CMD"
    ok "Autostart configured — app survives reboots"
  else
    warn "Could not detect pm2 startup command — run 'pm2 startup' manually"
  fi

  run_hook start

  ok "Install done."
}

# first-time setup shortcut
cmd_auto() {
  info "Full automated setup starting..."

  cmd_setup
  cmd_install
  cmd_nginx

  echo ""
  ok "All done! swportfolio.win should be live on port 80."
  pm2 status "$APP"
}

cmd_nginx() {
  CONF="/etc/nginx/sites-available/swportfolio"
  info "Writing Nginx config to $CONF..."

  # hook overrides port if present
  local app_port=3000
  if [[ -x "./.sys" ]]; then
    app_port=$(./.sys port 2>/dev/null || echo 3000)
  fi

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
  ok "Nginx configured — routing to port ${app_port}."
}

cmd_logs() {
  pm2 logs "$APP" --lines "${2:-50}"
}

cmd_status() {
  pm2 status "$APP"
}

cmd_restart() {
  pm2 restart "$APP"
  run_hook restart
  ok "Restarted."
}

cmd_stop() {
  pm2 stop "$APP"
  run_hook stop
  warn "Stopped."
}

cmd_help() {
  echo ""
  echo -e "  ${B}swportfolio.win — run.sh${N}"
  echo ""
  echo "  auto          Full first-time setup: Node + PM2 + Nginx + install"
  echo "  dev           Start local dev server"
  echo "  deploy        git pull + smart build + PM2 restart"
  echo "  setup         Install system deps (Node, PM2, Nginx, Postgres, Redis)"
  echo "  db            Create/verify database (swportfolio)"
  echo "  install       Install app deps + build + PM2 start (skips if up to date)"
  echo "  nginx         Write and apply Nginx config"
  echo "  logs [n]      PM2 logs (default: last 50 lines)"
  echo "  status        PM2 process status"
  echo "  restart       Restart PM2 process"
  echo "  stop          Stop PM2 process"
  echo ""
}

# dispatch
case "$CMD" in
  auto)     cmd_auto ;;
  dev)      cmd_dev ;;
  deploy)   cmd_deploy ;;
  setup)    cmd_setup ;;
  db)       cmd_db ;;
  install)  cmd_install ;;
  nginx)    cmd_nginx ;;
  logs)     cmd_logs "$@" ;;
  status)   cmd_status ;;
  restart)  cmd_restart ;;
  stop)     cmd_stop ;;
  *)        cmd_help ;;
esac
