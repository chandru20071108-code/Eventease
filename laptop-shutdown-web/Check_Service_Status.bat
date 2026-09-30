@echo off
setlocal enabledelayedexpansion
title PowerPulse — Service Status
cd /d "%~dp0"

echo ======================================================================
echo   PowerPulse — 24/7 Controller Status
echo ======================================================================
echo.

powershell -NoProfile -Command "try { $res = Invoke-RestMethod -Uri 'http://127.0.0.1:7890/api/status' -TimeoutSec 2; Write-Output ('STATUS:ONLINE|PID:' + (Get-Content -Path 'server.pid' -ErrorAction SilentlyContinue) + '|PORT:' + $res.port + '|IP:' + $res.lan_ip + '|BATTERY:' + $res.battery.percent + '%|TUNNEL:' + $res.tunnel_active + '|URL:' + $res.public_url + '|AUTH_URL:' + $res.authenticated_url) } catch { Write-Output 'STATUS:OFFLINE' }" > "%~dp0status_tmp.txt"

set /p RAW_STATUS=<"%~dp0status_tmp.txt"
del "%~dp0status_tmp.txt" >nul 2>&1

echo %RAW_STATUS% | findstr /i "STATUS:ONLINE" >nul 2>&1
if %errorlevel% equ 0 (
    echo   [●] SERVICE STATUS:    ACTIVE / RUNNING (24/7 Background)
    
    if exist "%~dp0public_url_full.txt" (
        for /f "usebackq delims=" %%A in ("%~dp0public_url_full.txt") do set "FULL_LINK=%%A"
        for /f "usebackq delims=" %%B in ("%~dp0public_url.txt") do set "CLEAN_LINK=%%B"
        echo   [🌍] PUBLIC INTERNET:  !CLEAN_LINK!
        echo   [🔑] PHONE DIRECT LINK:
        echo        !FULL_LINK!
        echo.
        echo   [🔒] SECURITY PIN:     7890
    ) else (
        echo   [⏳] PUBLIC TUNNEL:    Establishing connection...
    )
    
    echo.
    echo   [💻] LOCAL ACCESS:     http://localhost:7890
    echo ======================================================================
    echo.
    echo Press [O] to open the public website in your browser, or any other key to exit.
    choice /c OQ /n /m ""
    if errorlevel 2 exit /b 0
    if errorlevel 1 (
        if defined FULL_LINK (
            start "" "!FULL_LINK!"
        ) else (
            start "" http://localhost:7890
        )
    )
) else (
    echo   [○] SERVICE STATUS:    STOPPED / OFFLINE
    echo.
    echo   To start PowerPulse in the background, run "Install_AutoStart_On_Boot.bat"
    echo   or double-click "Start_Silent_Background.vbs".
    echo ======================================================================
    echo.
    pause
)
exit /b 0
