@echo off
cd /d "%~dp0"
echo Iniciando generador de rutas...
start http://localhost:3000
node server.js
pause
