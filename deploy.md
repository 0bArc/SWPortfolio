# Deploy Guide — kristiansen.icu

Cloudflare handles SSL. Server runs plain HTTP on port 3000 behind Nginx.

## 1. Server setup (Ubuntu 22.04+)

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2 + Nginx
sudo npm install -g pm2
sudo apt install -y nginx git
```

## 2. Deploy the app

```bash
sudo mkdir -p /var/www/kristiansen.icu
sudo chown $USER:$USER /var/www/kristiansen.icu

git clone <your-repo-url> /var/www/kristiansen.icu
cd /var/www/kristiansen.icu

npm install
cp .env.local.example .env.local   # or create from scratch
nano .env.local                    # set GITHUB_TOKEN
npm run build
```

**.env.local minimum:**
```
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

## 3. Start with PM2

```bash
cd /var/www/kristiansen.icu
pm2 start npm --name "kristiansen" -- start
pm2 save
pm2 startup   # copy/run the printed command
```

**Useful PM2 commands:**
```bash
pm2 status          # check running
pm2 logs kristiansen  # live logs
pm2 restart kristiansen
```

## 4. Nginx reverse proxy

```bash
sudo nano /etc/nginx/sites-available/kristiansen.icu
```

Paste:
```nginx
server {
    listen 80;
    server_name kristiansen.icu www.kristiansen.icu;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/kristiansen.icu /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 5. Cloudflare DNS

1. Add A record: `kristiansen.icu` → your server IP (proxied)
2. Add CNAME: `www` → `kristiansen.icu` (proxied)
3. SSL/TLS → set mode to **Full** (not Full Strict)
4. SSL/TLS → Edge Certificates → enable **Always Use HTTPS**

## 6. Redeploy after changes

```bash
cd /var/www/kristiansen.icu
git pull
npm install        # only if package.json changed
npm run build
pm2 restart kristiansen
```

## Firewall (ufw)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Port 3000 does NOT need to be open — Nginx proxies internally.
