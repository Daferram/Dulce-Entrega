#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then echo "Falta instalar Node.js: https://nodejs.org"; read -n 1 -s -r -p "Presioná una tecla"; exit 1; fi
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "Falta cloudflared. Instalalo con:  brew install cloudflared"
  read -n 1 -s -r -p "Presioná una tecla"; exit 1
fi
export CLAVE_BDD=$RANDOM$RANDOM
node server.js &
SERVIDOR=$!
trap "kill $SERVIDOR" EXIT
sleep 1 && open "http://localhost:3000/bdd.html?clave=$CLAVE_BDD"
echo ""
echo "  Publicando la tienda en internet: en unos segundos aparece la dirección https://….trycloudflare.com"
echo "  (también como código QR en el panel). No cierres esta ventana durante la presentación."
echo ""
cloudflared tunnel --url http://localhost:3000 --metrics 127.0.0.1:20241
