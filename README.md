# Infra

## Nginx

Skopiuj konfigurację na serwer:

```bash
sudo cp nginx.conf /etc/nginx/sites-available/krynica-morska
sudo ln -s /etc/nginx/sites-available/krynica-morska /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL

```bash
sudo certbot --nginx -d twojadomena.pl -d www.twojadomena.pl
```

## PM2

```bash
pm2 start dist/index.js --name krynica-morska
pm2 save
pm2 startup
```

cd server && npx tsx src/scripts/importReviews.ts
