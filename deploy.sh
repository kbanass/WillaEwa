#!/usr/bin/env bash
# deploy.sh — wdroż WillaEwa na serwerze
# Uruchamiać na serwerze docelowym z katalogu projektu.
set -euo pipefail

DEPLOY_DIR="/var/www/willa-ewa"
SERVER_ENV="$DEPLOY_DIR/server/.env"

echo "==> [1/7] Sprawdzanie wymagań..."
command -v node   >/dev/null || { echo "BŁĄD: node nie znaleziony"; exit 1; }
command -v npm    >/dev/null || { echo "BŁĄD: npm nie znaleziony"; exit 1; }
command -v pm2    >/dev/null || { echo "BŁĄD: pm2 nie znaleziony (npm install -g pm2)"; exit 1; }
command -v nginx  >/dev/null || { echo "BŁĄD: nginx nie znaleziony"; exit 1; }

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

# Serwer — skompilowany JS
rsync -av --delete server/dist/  "$DEPLOY_DIR/server/dist/"
cp ecosystem.config.cjs           "$DEPLOY_DIR/"

# Klient — zbudowane assets (nginx serwuje stąd)
rsync -av --delete client/dist/   "$DEPLOY_DIR/client/dist/"

echo "==> [6/7] Konfiguracja .env..."
if [ ! -f "$SERVER_ENV" ]; then
  cp server/.env.example "$SERVER_ENV"
  echo ""
  echo "  UWAGA: Uzupełnij $SERVER_ENV przed uruchomieniem!"
  echo "  Wymagane: JWT_SECRET, GOOGLE_API_KEY, GOOGLE_PLACE_ID"
  echo ""
fi

echo "==> [7/7] Restart PM2..."
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
echo "  3. nginx -t && systemctl reload nginx"
echo "  4. certbot --nginx -d willa-ewa.pl -d www.willa-ewa.pl"
echo "  5. pm2 startup  (aby PM2 startował po restarcie serwera)"
echo "  6. Utwórz konto admina: cd $DEPLOY_DIR/server && node dist/server/src/scripts/setup.js"
