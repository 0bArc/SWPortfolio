#!/usr/bin/env bash
set -euo pipefail

CMD="${1:-help}"

# Load .env.local if present
[[ -f .env.local ]] && set -a && source .env.local && set +a

APP="${AUS_APP_NAME:?AUS_APP_NAME not set in .env.local}"
DIR="${AUS_APP_DIR:?AUS_APP_DIR not set in .env.local}"

# ── Colours ───────────────────────────────────────────────────────────────────
R='\033[0;31m' G='\033[0;32m' Y='\033[1;33m' B='\033[0;34m' N='\033[0m'
info()  { echo -e "${B}[AUS]${N} $*"; }
ok()    { echo -e "${G}[OK]${N}  $*"; }
warn()  { echo -e "${Y}[WARN]${N} $*"; }
die()   { echo -e "${R}[ERR]${N} $*"; exit 1; }

# ── Commands ──────────────────────────────────────────────────────────────────

cmd_dev() {
  [[ -f .env.local ]] || die ".env.local missing — copy .env.local.example or create it"
  info "Starting dev server..."
  npm run dev
}

cmd_deploy() {
  info "Pulling latest..."
  git pull

  if git diff --name-only HEAD@{1} HEAD | grep -q "package-lock.json"; then
    info "package-lock.json changed — running npm ci..."
    npm ci
  else
    ok "No dependency changes, skipping install"
  fi

  info "Building..."
  npm run build

  if pm2 list | grep -q "$APP"; then
    info "Restarting PM2 process..."
    pm2 restart "$APP"
  else
    warn "PM2 process '$APP' not found — starting fresh"
    pm2 start npm --name "$APP" -- start
    pm2 save
  fi

  ok "Deployed."
  pm2 status "$APP"
}

cmd_setup() {
  info "Full server setup — Ubuntu 22.04+"

  # Node 20
  if ! command -v node &>/dev/null; then
    info "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
  else
    ok "Node $(node -v) already installed"
  fi

  # PM2
  if ! command -v pm2 &>/dev/null; then
    info "Installing PM2..."
    sudo npm install -g pm2
  else
    ok "PM2 already installed"
  fi

  # Nginx
  if ! command -v nginx &>/dev/null; then
    info "Installing Nginx..."
    sudo apt install -y nginx
    sudo systemctl enable nginx
  else
    ok "Nginx already installed"
  fi

  # App dir
  sudo mkdir -p "$DIR"
  sudo chown "$USER:$USER" "$DIR"

  ok "Setup complete. Next: git clone your repo to $DIR, then ./run.sh install"
}

cmd_install() {
  info "First-time install..."
  npm ci
  [[ -f .env.local ]] || { warn ".env.local missing — create it before building"; exit 1; }
  npm run build
  pm2 start npm --name "$APP" -- start
  pm2 save
  pm2 startup | tail -1
  ok "Done. Run the printed pm2 startup command as root to enable autostart."
}

cmd_nginx() {
  CONF="/etc/nginx/sites-available/kristiansen.icu"
  info "Writing Nginx config to $CONF..."
  sudo tee "$CONF" > /dev/null <<'NGINX'
server {
    listen 80;
    server_name kristiansen.icu www.kristiansen.icu;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX
  sudo ln -sf "$CONF" /etc/nginx/sites-enabled/
  sudo nginx -t && sudo systemctl reload nginx
  ok "Nginx configured and reloaded."
}

cmd_logs() {
  pm2 logs "$APP" --lines "${2:-50}"
}

cmd_status() {
  pm2 status "$APP"
}

cmd_restart() {
  pm2 restart "$APP"
  ok "Restarted."
}

cmd_stop() {
  pm2 stop "$APP"
  warn "Stopped."
}

cmd_aus() {
  SUB="${2:-help}"
  case "$SUB" in
    bootup)   npm run aus:bootup ;;
    warning)  npm run aus:warning ;;
    alert)    npm run aus:alert ;;
    severe)   npm run aus:severe ;;
    summary)  npm run aus:summary ;;
    simulate) npm run aus:simulate ;;
    *)
      echo "Usage: ./run.sh aus <bootup|warning|alert|severe|summary|simulate>"
      ;;
  esac
}

cmd_help() {
  echo ""
  echo -e "  ${B}kristiansen.icu — run.sh${N}"
  echo ""
  echo "  dev           Start local dev server"
  echo "  deploy        git pull + build + PM2 restart"
  echo "  setup         First-time server setup (Node, PM2, Nginx)"
  echo "  install       First-time app install + PM2 start"
  echo "  nginx         Write and apply Nginx config"
  echo "  logs [n]      PM2 logs (default: last 50 lines)"
  echo "  status        PM2 process status"
  echo "  restart       Restart PM2 process"
  echo "  stop          Stop PM2 process"
  echo "  aus <type>    Fire AUS test webhook (bootup/warning/alert/severe/summary/simulate)"
  echo ""
}

# ── Dispatch ──────────────────────────────────────────────────────────────────
case "$CMD" in
  dev)      cmd_dev ;;
  deploy)   cmd_deploy ;;
  setup)    cmd_setup ;;
  install)  cmd_install ;;
  nginx)    cmd_nginx ;;
  logs)     cmd_logs "$@" ;;
  status)   cmd_status ;;
  restart)  cmd_restart ;;
  stop)     cmd_stop ;;
  aus)      cmd_aus "$@" ;;
  *)        cmd_help ;;
esac
