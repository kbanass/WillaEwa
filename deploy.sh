#!/usr/bin/env bash
# deploy.sh — wdroż WillaEwa na serwerze
# Uruchamiać na serwerze docelowym z katalogu projektu.
set -euo pipefail

DEPLOY_DIR="/var/www/WillaEwa"
SERVER_ENV="$DEPLOY_DIR/server/.env"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> [1/7] Sprawdzanie wymagań..."
command -v node  >/dev/null || { echo "BŁĄD: node nie znaleziony"; exit 1; }
command -v npm   >/dev/null || { echo "BŁĄD: npm nie znaleziony"; exit 1; }
command -v pm2   >/dev/null || { echo "BŁĄD: pm2 nie znaleziony (npm install -g pm2)"; exit 1; }
command -v nginx >/dev/null || echo "  UWAGA: nginx nie znaleziony — skonfiguruj go ręcznie"

echo "==> [2/7] Instalacja zależności..."
npm run install:all

echo "==> [3/7] Budowanie projektu..."
npm run build

echo "==> [4/7] Kopiowanie szablonów nunjucks do client/dist..."
# generate.ts potrzebuje templates/ w CLIENT_DIR (= client/dist/) w czasie działania
cp -r client/templates client/dist/templates

echo "==> [5/7] Synchronizacja plików na serwer..."
mkdir -p "$DEPLOY_DIR/server/logs"
mkdir -p "$DEPLOY_DIR/server/data"

# Jeśli skrypt uruchamiany jest już z DEPLOY_DIR, pomijamy kopiowanie
if [ "$SCRIPT_DIR" != "$DEPLOY_DIR" ]; then
  mkdir -p "$DEPLOY_DIR/server/dist"
  mkdir -p "$DEPLOY_DIR/client/dist"
  rsync -a --delete server/dist/    "$DEPLOY_DIR/server/dist/"
  rsync -a --delete client/dist/    "$DEPLOY_DIR/client/dist/"
  cp ecosystem.config.cjs           "$DEPLOY_DIR/"
  echo "  Zsynchronizowano pliki do $DEPLOY_DIR"
else
  echo "  Projekt już w $DEPLOY_DIR — pomijam rsync"
fi

echo "==> [6/7] Konfiguracja .env..."
if [ ! -f "$SERVER_ENV" ]; then
  cp server/.env.example "$SERVER_ENV"
  echo ""
  echo "  UWAGA: Uzupełnij $SERVER_ENV przed uruchomieniem!"
  echo "  Wymagane: JWT_SECRET, SERPAPI_API_KEY, GOOGLE_PLACE_ID"
  echo ""
fi

echo "==> [7/8] Aktualizacja konfiguracji nginx..."
NGINX_CONF="/etc/nginx/sites-available/willa-ewa"
if [ -f "$NGINX_CONF" ]; then
  sudo cp infra/nginx.conf "$NGINX_CONF"
  sudo nginx -t && sudo systemctl reload nginx && echo "  nginx przeładowany" || echo "  UWAGA: nginx -t nie przeszedł — sprawdź konfigurację"
else
  echo "  Pomijam nginx — $NGINX_CONF nie istnieje (pierwsze wdrożenie, skonfiguruj ręcznie)"
fi

echo "==> [8/8] Restart PM2..."
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
echo "  1. Uzupełnij $SERVER_ENV"
echo "  2. Skopiuj infra/nginx.conf do /etc/nginx/sites-available/willa-ewa"
echo "     i utwórz symlink: ln -s /etc/nginx/sites-available/willa-ewa /etc/nginx/sites-enabled/"
echo "  3. sudo nginx -t && sudo systemctl reload nginx"
echo "  4. sudo certbot --nginx -d willaewanadmorzem.pl -d www.willaewanadmorzem.pl"
echo "  5. pm2 startup && pm2 save  (aby PM2 startował po restarcie serwera)"
echo "  6. Utwórz konto admina: cd $DEPLOY_DIR/server && node dist/server/src/scripts/setup.js"
