@echo off
title Create Desktop Shortcuts for PowerPulse
cd /d "%~dp0"

echo ======================================================================
echo   PowerPulse — Creating Desktop Shortcuts
echo ======================================================================
echo.

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $d = [Environment]::GetFolderPath('Desktop'); $s = $ws.CreateShortcut([System.IO.Path]::Combine($d, 'PowerPulse Laptop Controller.lnk')); $s.TargetPath = '%~dp0Open_Public_Website.bat'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = 'shell32.dll,27'; $s.Description = 'Open PowerPulse 24/7 Remote Shutdown Controller'; $s.Save()"

if %errorlevel% equ 0 (
    echo [OK] 'PowerPulse Laptop Controller' shortcut placed on your Windows Desktop!
) else (
    echo [!] Failed to create desktop shortcut.
)

echo.
pause
