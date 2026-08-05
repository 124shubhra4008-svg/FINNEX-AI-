@echo off
REM One-click backend starter. Just double-click this file.
REM Safe to run multiple times.

cd /d "%~dp0"

echo ============================================
echo   FINNEX AI+ Backend - Starting
echo ============================================

if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat

echo Installing/updating dependencies...
pip install -r requirements.txt --quiet

echo.
echo Starting backend on http://localhost:8000
echo Keep this window open. Press Ctrl+C to stop.
echo ============================================
uvicorn main:app --reload --port 8000

pause
