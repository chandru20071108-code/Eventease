@echo off
cd /d "%~dp0"

if exist "%~dp0public_url_full.txt" (
    for /f "usebackq delims=" %%A in ("%~dp0public_url_full.txt") do (
        echo Opening PowerPulse Public Website: %%A
        start "" "%%A"
    )
) else (
    echo [*] Public URL file not found yet. Opening localhost...
    start "" http://localhost:7890
)
exit /b 0
