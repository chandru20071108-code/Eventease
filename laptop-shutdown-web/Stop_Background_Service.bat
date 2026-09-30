@echo off
title PowerPulse — Stop Background Service
cd /d "%~dp0"

echo ======================================================================
echo   PowerPulse — Stopping Background Service
echo ======================================================================
echo.

if exist "%~dp0server.pid" (
    set /p PID_VAL=<"%~dp0server.pid"
    echo [*] Stopping Python server (PID: !PID_VAL!)...
    taskkill /F /PID !PID_VAL! >nul 2>&1
    del "%~dp0server.pid" >nul 2>&1
)

echo [*] Terminating background cloudflared tunnel processes...
taskkill /F /IM cloudflared.exe >nul 2>&1

echo [*] Checking for lingering server instances on port 7890...
powershell -NoProfile -Command "$conn = Get-NetTCPConnection -LocalPort 7890 -ErrorAction SilentlyContinue; if ($conn) { foreach ($c in $conn) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } }"

echo.
echo [SUCCESS] PowerPulse background service and tunnel have been stopped!
echo.
pause
