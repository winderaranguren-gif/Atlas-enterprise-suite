@echo off
cd /d "%~dp0"
echo Starting Atlas Enterprise Suite...
start "" http://127.0.0.1:4173
node server.js
pause
