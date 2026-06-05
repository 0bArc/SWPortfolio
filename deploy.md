# Deploy — swportfolio.win

Cloudflare → Nginx → PM2 → Next.js on port 3000.

## Quick reference

```bash
./run.sh dev        # local dev
./run.sh deploy     # pull + build + restart (normal redeploy)
./run.sh logs       # live logs
./run.sh status     # PM2 status
./run.sh restart    # restart without rebuild
```

---

## First-time server setup

```bash
# 1. Clone
sudo mkdir -p /var/www/swportfolio.win
sudo chown $USER:$USER /var/www/swportfolio.win
git clone <repo-url> /var/www/swportfolio.win
cd /var/www/swportfolio.win

# 2. Install Node/PM2/Nginx
./run.sh setup

# 3. Create .env.local (minimum fields below), then:
./run.sh install

# 4. Nginx
./run.sh nginx

# 5. Firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### .env.local

```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_GITHUB_USER=your_github_user
NEXT_PUBLIC_SITE_OWNER=Your Name
# NEXT_PUBLIC_FEATURED_WORK=https://...

# run.sh
APP_NAME=your-pm2-app-name
APP_DIR=/var/www/your-site
```

---

## Cloudflare DNS

| Type  | Name | Value          | Proxy |
|-------|------|----------------|-------|
| A     | @    | your-server-ip | On    |
| CNAME | www  | swportfolio.win | On   |

SSL/TLS → **Full** (not Full Strict) → Always Use HTTPS on.

---

## Redeploy after changes

```bash
cd /var/www/swportfolio.win
./run.sh deploy
```

That's it.
