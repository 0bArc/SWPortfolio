# Deploy — kristiansen.icu

Cloudflare → Nginx → PM2 → Next.js on port 3000.

## Quick reference

```bash
./run.sh dev        # local dev
./run.sh deploy     # pull + build + restart (normal redeploy)
./run.sh logs       # live logs
./run.sh status     # PM2 status
./run.sh restart    # restart without rebuild
./run.sh aus <type> # fire AUS test webhook
```

---

## First-time server setup

```bash
# 1. Clone
sudo mkdir -p /var/www/kristiansen.icu
sudo chown $USER:$USER /var/www/kristiansen.icu
git clone <repo-url> /var/www/kristiansen.icu
cd /var/www/kristiansen.icu

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
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
NEXT_PUBLIC_GITHUB_USER=0bArc
NEXT_PUBLIC_SITE_OWNER=Sander Kristiansen
# NEXT_PUBLIC_FEATURED_WORK=https://...
```

---

## Cloudflare DNS

| Type  | Name | Value          | Proxy |
|-------|------|----------------|-------|
| A     | @    | your-server-ip | On    |
| CNAME | www  | kristiansen.icu | On   |

SSL/TLS → **Full** (not Full Strict) → Always Use HTTPS on.

---

## GitHub secrets (for AUS Actions)

`DISCORD_WEBHOOK_URL` → Settings → Secrets and variables → Actions

---

## Redeploy after changes

```bash
cd /var/www/kristiansen.icu
./run.sh deploy
```

That's it.
