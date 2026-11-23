#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Falta instalar Node.js: https://nodejs.org"
  read -n 1 -s -r -p "Presioná una tecla para cerrar"
  exit 1
fi
(sleep 1 && open http://localhost:3000) &
node server.js
