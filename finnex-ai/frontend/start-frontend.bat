@echo off
REM One-click frontend starter. Just double-click this file.
REM This kills any old server still running on port 3000, clears the build
REM cache, reinstalls dependencies, and starts fresh -- so you always get
REM the current code, never a stale cached version.

cd /d "%~dp0"

echo ============================================
echo   FINNEX AI+ Frontend - Resetting and Starting
echo ============================================

echo Stopping any old server on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo   Killing process %%a
    taskkill /PID %%a /F >nul 2>&1
)

if exist .next (
    echo Clearing old build cache...
    rmdir /s /q .next
)

echo Installing/updating dependencies...
call npm install --silent

echo.
echo Starting frontend on http://localhost:3000
echo Keep this window open. Press Ctrl+C to stop.
echo ============================================
call npm run dev

pause
