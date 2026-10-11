#!/usr/bin/env bash
# Eenmalige installatie van de Envoy-logger op een Raspberry Pi (Raspberry Pi OS / Debian).
# Gebruik:  bash setup.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USER_NAME="${SUDO_USER:-$USER}"
ENVFILE="$HOME/.envoy/logger.env"

echo "==> Node.js controleren"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]; then
  echo "Node 18+ is nodig. Installeren via NodeSource (Node 22)..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "==> Configuratie aanmaken"
mkdir -p "$HOME/.envoy" && chmod 700 "$HOME/.envoy"
if [ ! -f "$ENVFILE" ]; then
  APP_KEY="$(head -c 24 /dev/urandom | base64 | tr -d '/+=' | head -c 32)"
  cat > "$ENVFILE" <<EOF
APP_KEY=$APP_KEY
ENVOY_HOST=envoy.local
SYSTEM_NAME=Thuis
# SYSTEM_WP=0
# ALLOWED_ORIGIN=https://remcodik.github.io
BIND=127.0.0.1
PORT=8787
EOF
  chmod 600 "$ENVFILE"
  echo "Nieuwe API key aangemaakt in $ENVFILE"
fi

echo "==> Token ophalen (vraagt je Enlighten-gegevens, alleen hier op de Pi)"
if [ ! -f "$HOME/.envoy/token" ]; then
  set -a; . "$ENVFILE"; set +a
  node "$DIR/get-token.mjs"
fi

echo "==> Service installeren en starten"
sed -e "s|__USER__|$USER_NAME|" -e "s|__DIR__|$DIR|g" -e "s|__ENVFILE__|$ENVFILE|" \
  "$DIR/envoy-logger.service" | sudo tee /etc/systemd/system/envoy-logger.service >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable --now envoy-logger

sleep 3
set -a; . "$ENVFILE"; set +a
echo "==> Controle"
curl -fsS -H "X-Api-Key: $APP_KEY" "http://127.0.0.1:${PORT:-8787}/api/health" || echo "(nog geen antwoord — bekijk: journalctl -u envoy-logger -n 30)"
echo
echo "Klaar. Jouw API key (voor in de app): $APP_KEY"
