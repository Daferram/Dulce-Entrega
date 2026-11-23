@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Falta instalar Node.js: https://nodejs.org & pause & exit /b)
start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000"
node server.js
pause
