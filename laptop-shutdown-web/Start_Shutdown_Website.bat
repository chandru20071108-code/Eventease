@echo off
title PowerPulse — One-Click Laptop Shutdown Web Controller
cd /d "%~dp0"

echo ========================================================
echo   PowerPulse - 1-Click Laptop Shutdown Controller
echo ========================================================
echo.
echo [*] Checking Python runtime...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Python is not installed or not in your PATH.
    echo [!] Please install Python 3 or ensure it is in your system PATH.
    pause
    exit /b 1
)

echo [*] Starting local controller server on port 7890...
start "" http://localhost:7890

echo [*] Server is running!
echo [*] Open in browser: http://localhost:7890
echo [*] (Keep this window open while using the website)
echo.
python server.py

pause
