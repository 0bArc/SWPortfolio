# swportfolio

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![PM2](https://img.shields.io/badge/PM2-runtime-2B037A?style=flat-square&logo=pm2&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-proxy-009639?style=flat-square&logo=nginx&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-DNS%2FSSL-F38020?style=flat-square&logo=cloudflare&logoColor=white)

Personal portfolio site. Built with Next.js 16 App Router, Tailwind v4, shadcn v4.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, PPR) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 + shadcn v4 (base-ui) |
| Data | GitHub API (server-side, cached) |
| Runtime | Node.js 20 + PM2 |
| Proxy | Nginx |
| DNS / SSL | Cloudflare |

---

## Local Development

**Requirements:** Node.js 20+, npm

```bash
git clone https://github.com/0bArc/SWPortfolio
cd SWPortfolio
npm install
```

Create `.env.local`:

```env
GITHUB_TOKEN=ghp_your_token
NEXT_PUBLIC_GITHUB_USER=your_github_user
NEXT_PUBLIC_SITE_OWNER=Your Name
NEXT_PUBLIC_CONTACT_EMAIL=you@example.com
NEXT_PUBLIC_FEATURED_WORK=https://your-featured-site.com

# run.sh
APP_NAME=your-pm2-app-name
APP_DIR=/var/www/your-site

# Silence banner during local dev
DEV_MODE=true
NEXT_PUBLIC_DEV_MODE=true

# Optional site-wide banner (remove to hide)
# NEXT_PUBLIC_BANNER=Your message here
```

```bash
./run.sh dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Production Deployment

### First time — one command

```bash
git clone https://github.com/0bArc/SWPortfolio /var/www/your-site
cd /var/www/your-site
nano .env.local   # fill in your values, set DEV_MODE=false
./run.sh auto
```

`auto` runs `setup` → `install` → `nginx` in sequence: installs Node 20, PM2, Nginx, builds the app, starts it under PM2 with autostart on reboot, and writes the Nginx reverse proxy config.

Then open the firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Cloudflare DNS

| Type | Name | Value | Proxied |
|---|---|---|---|
| A | @ | your-server-ip | Yes |
| CNAME | www | your-domain.com | Yes |

SSL/TLS mode: **Full** (not Full Strict). Enable Always Use HTTPS.

### Redeploy after changes

```bash
./run.sh deploy
```

Pulls latest, runs `npm ci` only if `package-lock.json` changed, rebuilds, restarts PM2.

---

## run.sh Reference

```bash
./run.sh auto             # full first-time setup: Node + PM2 + Nginx + install
./run.sh dev              # start local dev server
./run.sh deploy           # git pull + smart build + PM2 restart
./run.sh setup            # install system deps (Node, PM2, Nginx)
./run.sh install          # install app deps + build + PM2 start (skips if up to date)
./run.sh nginx            # write and reload Nginx config
./run.sh logs [n]         # PM2 logs, last n lines (default 50)
./run.sh status           # PM2 process status
./run.sh restart          # restart without rebuild
./run.sh stop             # stop PM2 process
```

`install` skips `npm ci` if `package-lock.json` hasn't changed and skips the build if no source files changed since the last build.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GITHUB_TOKEN` | Yes | GitHub PAT with `read:user` and `public_repo` scopes |
| `NEXT_PUBLIC_GITHUB_USER` | Yes | GitHub username for repo/profile fetching |
| `NEXT_PUBLIC_SITE_OWNER` | Yes | Display name used in page titles |
| `NEXT_PUBLIC_CONTACT_EMAIL` | No | Contact email shown on site |
| `NEXT_PUBLIC_FEATURED_WORK` | No | URL for featured work in Experience section |
| `APP_NAME` | Yes (server) | PM2 process name used by run.sh |
| `APP_DIR` | Yes (server) | Server app directory used by run.sh |
| `DEV_MODE` | No | Set `true` to silence notifications during development |
| `NEXT_PUBLIC_DEV_MODE` | No | Set `true` to hide the site banner during development |
| `NEXT_PUBLIC_BANNER` | No | Site-wide banner message (remove line to hide banner) |
