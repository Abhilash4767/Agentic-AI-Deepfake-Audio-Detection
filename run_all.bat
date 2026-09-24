@echo off
title VeriVox Launcher
echo ============================================================
echo Starting VeriVox Deepfake Detection Platform...
echo ============================================================
start "VeriVox AI Backend" cmd /k "cd /d %~dp0backend && .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"
start "VeriVox Web Frontend" cmd /k "cd /d %~dp0 && npm run dev"
echo.
echo Both servers launched in separate windows!
echo - Web App: http://localhost:8080
echo - Backend API: http://localhost:8000
echo ============================================================
pause
