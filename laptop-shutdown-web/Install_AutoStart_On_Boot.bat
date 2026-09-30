@echo off
title PowerPulse — Install 24/7 Background Auto-Start Service
cd /d "%~dp0"

echo ======================================================================
echo   PowerPulse — 24/7 Background Auto-Start Installer
echo ======================================================================
echo.
echo [*] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] ERROR: Python is not detected in your PATH.
    echo [!] Please install Python 3 and ensure "Add to PATH" is checked.
    pause
    exit /b 1
)

echo [*] Registering background service in Windows Startup folder...
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_SCRIPT=%~dp0Start_Silent_Background.vbs"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\PowerPulse_Shutdown_Service.lnk"

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%VBS_SCRIPT%'; $s.WorkingDirectory = '%~dp0'; $s.Description = 'PowerPulse 24/7 Background Shutdown Controller'; $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo [OK] Successfully registered in Windows Startup!
    echo      Whenever your laptop boots or logs in, PowerPulse will run silently in background.
) else (
    echo [!] Warning: Could not create startup shortcut in %STARTUP_FOLDER%.
)

echo.
echo [*] Starting background service right now (silent, no black window)...
wscript "%~dp0Start_Silent_Background.vbs"

echo [*] Connecting to Cloudflare Tunnel (generating public HTTPS URL)...
powershell -NoProfile -Command "Start-Sleep -Seconds 5"

if exist "%~dp0public_url_full.txt" (
    set /p PUBLIC_LINK=<"%~dp0public_url_full.txt"
    echo.
    echo ======================================================================
    echo   [SUCCESS] POWERPULSE IS NOW RUNNING 24/7 IN THE BACKGROUND!
    echo ======================================================================
    echo.
    echo   Your Public Internet Link:
    echo   !PUBLIC_LINK!
    echo.
    echo   Security PIN: 7890
    echo   (Works on mobile 4G/5G, phone camera QR scan, or any browser)
    echo ======================================================================
) else (
    echo.
    echo [OK] Background service started!
    echo [*] Tunnel is establishing. Run "Check_Service_Status.bat" in a few seconds to see your link.
)

echo.
echo Press [O] to open the website in your browser now, or any other key to exit:
choice /c OQ /n /m ""
if errorlevel 2 goto :exit
if errorlevel 1 goto :open_browser

:open_browser
if exist "%~dp0public_url_full.txt" (
    for /f "usebackq delims=" %%A in ("%~dp0public_url_full.txt") do start "" "%%A"
) else (
    start "" http://localhost:7890
)

:exit
exit /b 0
