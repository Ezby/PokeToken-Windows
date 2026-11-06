@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or newer is required. Install the LTS version, then try again.
  start "" "https://nodejs.org/"
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-PokeToken.ps1"
if errorlevel 1 pause
