@echo off
title PowerPulse — Uninstall Auto-Start
cd /d "%~dp0"

echo ======================================================================
echo   PowerPulse — Remove From Windows Startup
echo ======================================================================
echo.

set "SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\PowerPulse_Shutdown_Service.lnk"

if exist "%SHORTCUT_PATH%" (
    del "%SHORTCUT_PATH%" >nul 2>&1
    echo [OK] Successfully removed PowerPulse from Windows Startup.
    echo      It will no longer start automatically when your laptop boots.
) else (
    echo [*] PowerPulse was not found in Windows Startup.
)

echo.
echo Would you also like to stop the currently running background service? (Y/N)
choice /c YN /m "Select option"
if errorlevel 2 goto :done
if errorlevel 1 call "%~dp0Stop_Background_Service.bat"

:done
echo.
pause
