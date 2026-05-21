@echo off
setlocal
cd /d "%~dp0"

set NODE_USE_ENV_PROXY=1
set HTTP_PROXY=http://127.0.0.1:7897
set HTTPS_PROXY=http://127.0.0.1:7897
set APPDATA=%~dp0.netlify-cli-appdata
set LOCALAPPDATA=%~dp0.netlify-cli-local

echo Starting nb-bo local server...
echo Open http://localhost:8888 after the server is ready.
echo Logs: %~dp0local-netlify-dev.log

call npm run build > ".\local-netlify-dev.log" 2>&1
node ".\local-server.mjs"
