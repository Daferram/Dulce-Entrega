@echo off
title Dulce Entrega - modo clase
cd /d "%~dp0"
where node >nul 2>nul || (echo Falta instalar Node.js: https://nodejs.org & pause & exit /b)
where cloudflared >nul 2>nul || (
  echo Instalando cloudflared, el programa que publica la tienda en internet...
  winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
  echo.
  echo Listo. Cerra esta ventana y volve a abrir iniciar-clase-windows.bat
  pause
  exit /b
)
set CLAVE_BDD=%RANDOM%%RANDOM%
start "Dulce Entrega - servidor (no cerrar)" cmd /k node server.js
timeout /t 2 >nul
start "" "http://localhost:3000/bdd.html?clave=%CLAVE_BDD%"
echo.
echo  Publicando la tienda en internet. En unos segundos aparece una direccion
echo  https://....trycloudflare.com  (tambien se ve como codigo QR en el panel).
echo  NO cierres esta ventana durante la presentacion.
echo.
cloudflared tunnel --url http://localhost:3000 --metrics 127.0.0.1:20241
pause
