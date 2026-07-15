#!/usr/bin/env bash
# deploy.sh — wdroż WillaEwa na serwerze
# Uruchamiać na serwerze docelowym z katalogu projektu.
set -euo pipefail

DEPLOY_DIR="/var/www/WillaEwa"
SERVER_ENV="$DEPLOY_DIR/server/.env"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> [1/9] Sprawdzanie wymagań..."
command -v node  >/dev/null || { echo "BŁĄD: node nie znaleziony"; exit 1; }
command -v npm   >/dev/null || { echo "BŁĄD: npm nie znaleziony"; exit 1; }
command -v pm2   >/dev/null || { echo "BŁĄD: pm2 nie znaleziony (npm install -g pm2)"; exit 1; }
command -v nginx >/dev/null || echo "  UWAGA: nginx nie znaleziony — skonfiguruj go ręcznie"

echo "==> [2/9] Instalacja zależności..."
npm install
npm install --prefix server
npm install --prefix astro

echo "==> [3/9] Budowanie serwera..."
npm run build --prefix server

echo "==> [4/9] Budowanie frontendu Astro..."
# Serwer musi być uruchomiony przed budowaniem (pobiera opinie z /api/reviews/public)
# Na VPS serwer jest uruchomiony przez PM2 — możemy wywołać build bezpośrednio
BACKEND_URL="http://localhost:3000" npm run build --prefix astro

echo "==> [5/9] Kopiowanie szablonów nunjucks do client/dist..."
# generate.ts potrzebuje templates/ podczas akceptacji opinii
mkdir -p "$DEPLOY_DIR/client/dist"
cp -r client/templates client/dist/templates 2>/dev/null || true

echo "==> [6/9] Synchronizacja plików na serwer..."
mkdir -p "$DEPLOY_DIR/server/logs"
mkdir -p "$DEPLOY_DIR/server/data"

if [ "$SCRIPT_DIR" != "$DEPLOY_DIR" ]; then
  mkdir -p "$DEPLOY_DIR/server/dist"
  mkdir -p "$DEPLOY_DIR/astro/dist"
  rsync -a --delete server/dist/    "$DEPLOY_DIR/server/dist/"
  rsync -a --delete astro/dist/     "$DEPLOY_DIR/astro/dist/"
  # Pliki źródłowe astro potrzebne są do rebuildu przez webhook
  rsync -a --delete --exclude='node_modules' --exclude='dist' \
    astro/ "$DEPLOY_DIR/astro/"
  cp ecosystem.config.cjs "$DEPLOY_DIR/"
  echo "  Zsynchronizowano pliki do $DEPLOY_DIR"
else
  echo "  Projekt już w $DEPLOY_DIR — pomijam rsync"
fi

echo "==> [7/9] Konfiguracja .env..."
if [ ! -f "$SERVER_ENV" ]; then
  cp server/.env.example "$SERVER_ENV"
  echo ""
  echo "  UWAGA: Uzupełnij $SERVER_ENV przed uruchomieniem!"
  echo "  Wymagane: JWT_SECRET, SERPAPI_API_KEY, GOOGLE_PLACE_ID"
  echo "  Opcjonalne: REBUILD_SECRET (sekret dla webhooka Sanity)"
  echo ""
fi

echo "==> [8/9] Aktualizacja konfiguracji nginx..."
NGINX_CONF="/etc/nginx/sites-enabled/willa-ewa"
if [ -f "$NGINX_CONF" ]; then
  sudo cp infra/nginx.conf "$NGINX_CONF"
  sudo nginx -t && sudo systemctl reload nginx && echo "  nginx przeładowany" || echo "  UWAGA: nginx -t nie przeszedł — sprawdź konfigurację"
else
  echo "  Pomijam nginx — $NGINX_CONF nie istnieje (pierwsze wdrożenie, skonfiguruj ręcznie)"
fi

echo "==> [9/9] Restart PM2..."
cd "$DEPLOY_DIR"
if pm2 list | grep -q "willa-ewa"; then
  pm2 reload ecosystem.config.cjs --env production
else
  pm2 start ecosystem.config.cjs --env production
  pm2 save
fi

echo ""
echo "✓ Deploy zakończony."
echo ""
echo "Następne kroki (jeśli pierwsze wdrożenie):"
echo "  1. Uzupełnij $SERVER_ENV (w tym REBUILD_SECRET)"
echo "  2. Skopiuj infra/nginx.conf do /etc/nginx/sites-available/willa-ewa"
echo "     i utwórz symlink: ln -s /etc/nginx/sites-available/willa-ewa /etc/nginx/sites-enabled/"
echo "  3. sudo nginx -t && sudo systemctl reload nginx"
echo "  4. sudo certbot --nginx -d willaewanadmorzem.pl -d www.willaewanadmorzem.pl"
echo "  5. pm2 startup && pm2 save"
echo "  6. Utwórz konto admina: cd $DEPLOY_DIR/server && node dist/server/src/scripts/setup.js"
echo "  7. Skonfiguruj webhook w Sanity: POST https://willaewanadmorzem.pl/api/rebuild"
echo "     Header: x-rebuild-secret: [wartość REBUILD_SECRET z .env]"
