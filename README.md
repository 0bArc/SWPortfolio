# kristiansen.icu

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![PM2](https://img.shields.io/badge/PM2-runtime-2B037A?style=flat-square&logo=pm2&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-proxy-009639?style=flat-square&logo=nginx&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-DNS%2FSSL-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![AUS](https://img.shields.io/badge/AUS-Auto%20Update%20Security-red?style=flat-square)

Personal portfolio site. Built with Next.js 16 App Router, Tailwind v4, shadcn v4. Includes AUS (Auto Update Security) for real-time threat detection and Discord alerting.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 + shadcn v4 (base-ui) |
| Data | GitHub API (server-side, cached) |
| Security | AUS via proxy.ts + GitHub Actions |
| Runtime | Node.js 20 + PM2 |
| Proxy | Nginx |
| DNS / SSL | Cloudflare |

---

## Local Development

**Requirements:** Node.js 20+, npm

```bash
git clone https://github.com/0bArc/kristiansen.icu
cd kristiansen.icu
npm install
```

Create `.env.local`:

```env
GITHUB_TOKEN=ghp_your_token
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
NEXT_PUBLIC_GITHUB_USER=your_github_user
NEXT_PUBLIC_SITE_OWNER=Your Name
NEXT_PUBLIC_FEATURED_WORK=https://your-featured-site.com

# run.sh config
AUS_APP_NAME=your-pm2-app-name
AUS_APP_DIR=/var/www/your-site
```

Start dev server:

```bash
./run.sh dev
# or: npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Production Deployment

### First-time server setup (Ubuntu 22.04+)

```bash
# Clone the repo on your server
git clone https://github.com/0bArc/kristiansen.icu /var/www/your-site
cd /var/www/your-site

# Install Node.js 20, PM2, Nginx
./run.sh setup

# Create .env.local with your values (see above)
nano .env.local

# Install dependencies, build, and start with PM2
./run.sh install

# Write and apply Nginx config
./run.sh nginx

# Open firewall
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
cd /var/www/your-site
./run.sh deploy
```

Pull + smart install + build + PM2 restart in one command.

---

## run.sh Reference

```bash
./run.sh dev              # start local dev server
./run.sh deploy           # pull + build + restart
./run.sh setup            # first-time server setup
./run.sh install          # first-time app install + PM2 start
./run.sh nginx            # write and reload Nginx config
./run.sh logs [n]         # PM2 logs, last n lines (default 50)
./run.sh status           # PM2 process status
./run.sh restart          # restart without rebuild
./run.sh stop             # stop PM2 process
./run.sh aus <type>       # fire AUS test webhook
```

---

## AUS (Auto Update Security)

Real-time security layer with zero maintenance.

### What runs on every request

- **Probe blocking** -- blocks scanners probing for WordPress, PHP, .env, .git, phpMyAdmin, shell paths, and more
- **Scanner UA detection** -- instantly blocks GoBuster, Nikto, sqlmap, Nuclei, Nmap, and 14 other known tools
- **Rate limiting** -- 100 requests per minute per IP, returns 429
- **Slow scan detection** -- 20 unique blocked paths from one IP in 5 minutes triggers an alert
- **Security headers** -- CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy on every response

### Response Management

When an attack is detected, AUS sends exactly two Discord messages per incident -- no flooding:

1. **Instant severe alert** (red, pings role) fires the moment an attack threshold is crossed
2. **Incident summary** fires once traffic has been quiet for 45 seconds, with full details: duration, event counts, IPs, paths, repeat offenders

Discord rate limit is respected with a 3-second minimum gap between sends (safe under the 30/min webhook limit).

### Weekly automation (GitHub Actions)

Every Monday at 08:00 UTC:
- Runs `npm audit` against all dependencies
- If vulnerabilities found: applies `npm audit fix`, opens a PR, sends Discord alert
- If clean: sends a green Discord confirmation

Dependabot also opens weekly PRs for security patch updates.

### AUS test commands

```bash
npm run aus:bootup        # white -- server online
npm run aus:warning       # yellow -- probe blocked
npm run aus:alert         # orange -- rate limit
npm run aus:severe        # red -- critical, pings role
npm run aus:summary       # preview incident summary format
npm run aus:simulate      # fire a full simulated attack against localhost:3000
```

### GitHub secrets required

Add `DISCORD_WEBHOOK_URL` to your repo under Settings > Secrets and variables > Actions.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GITHUB_TOKEN` | Yes | GitHub PAT with `read:user` and `public_repo` scopes |
| `DISCORD_WEBHOOK_URL` | Yes | Discord webhook for AUS alerts |
| `NEXT_PUBLIC_GITHUB_USER` | Yes | GitHub username for repo fetching |
| `NEXT_PUBLIC_SITE_OWNER` | Yes | Display name used in page titles |
| `NEXT_PUBLIC_FEATURED_WORK` | No | URL for featured work OG card in Experience section |
| `AUS_APP_NAME` | Yes (server) | PM2 process name, used by run.sh |
| `AUS_APP_DIR` | Yes (server) | Server app directory, used by run.sh |
